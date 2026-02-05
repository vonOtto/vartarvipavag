import Foundation
import AVFoundation

/// Audio engine for the TV client.
///
/// - Music bed: two AVAudioPlayer slots (A / B) for seamless crossfade.
/// - Ducking: automatic −10 dB / 150 ms attack / 900 ms release on every
///   `playVoice` call — no explicit AUDIO_DUCK event (contracts v1.3.0).
/// - SFX: fire-and-forget; never ducked.
/// - Prefetch: TTS clips cached in memory via `prefetch()` so `playVoice`
///   starts with zero network latency.
@MainActor
class AudioManager {

    // MARK: – envelope constants (audio_timeline.md)
    private static let duckDb      : Float  = -10.0
    private static let duckAttack  : Double = 0.150   // seconds
    private static let duckRelease : Double = 0.900   // seconds

    // MARK: – music bed
    private var musicA        : AVAudioPlayer?
    private var musicB        : AVAudioPlayer?
    private var activeIsA     = true                   // which slot is currently playing
    private var baseMusicGain : Float = 1.0            // host gain, linear
    private var musicTask     : Task<Void, Never>?    // crossfade or fadeout in progress

    // MARK: – duck + voice
    private var duckFactor    : Float = 1.0            // multiplied onto baseMusicGain
    private var duckTask      : Task<Void, Never>?
    private var voicePlayer   : AVAudioPlayer?         // used when volume <= 1.0
    private var voiceTask     : Task<Void, Never>?

    // MARK: – AVAudioEngine path (voice volume > 1.0)
    // AVAudioPlayer.volume is clamped to [0, 1] by the runtime.  When the
    // server requests volume > 1.0 (e.g. 1.4 for clue-read TTS) we route
    // through an AVAudioEngine with a mixer-node whose outputVolume IS allowed
    // above 1.0.  Music and SFX are unaffected.
    private var engine        : AVAudioEngine?
    private var enginePlayer  : AVAudioPlayerNode?
    private var engineMixer   : AVAudioMixerNode?

    // MARK: – prefetch cache
    private var prefetchCache : [String: Data] = [:]   // clipId → raw bytes

    // ── music ───────────────────────────────────────────────────────────────

    /// Start or crossfade to a music track.
    func playMusic(trackId: String, fadeInMs: Int, loop: Bool, gainDb: Float) {
        guard let url  = asset(trackId),
              let next = try? AVAudioPlayer(contentsOf: url) else {
            print("[Audio] music not found: \(trackId)"); return
        }
        next.numberOfLoops = loop ? -1 : 0
        next.prepareToPlay()
        baseMusicGain = Self.lin(gainDb)

        let out  = activeIsA ? musicA : musicB   // currently playing (outgoing)
        let outV = out?.volume ?? 0
        // Store next in the inactive slot, then toggle
        if activeIsA { musicB = next } else { musicA = next }
        activeIsA = !activeIsA

        next.volume = 0
        next.play()

        let tgt = baseMusicGain * duckFactor
        musicTask?.cancel()
        musicTask = Task {
            await self.ramp(dur: Double(fadeInMs) / 1000) { t in
                next.volume = tgt * t
                out?.volume = outV * (1 - t)
            }
            out?.stop()
        }
    }

    /// Fade out and stop the active music track.
    func stopMusic(fadeOutMs: Int) {
        musicTask?.cancel()
        guard let active = activeIsA ? musicA : musicB else { return }
        let v = active.volume
        musicTask = Task {
            await self.ramp(dur: Double(fadeOutMs) / 1000) { t in
                active.volume = v * (1 - t)
            }
            active.stop()
        }
    }

    /// Host volume slider — applied instantly (MUSIC_GAIN_SET).
    func setMusicGain(gainDb: Float) {
        baseMusicGain = Self.lin(gainDb)
        (activeIsA ? musicA : musicB)?.volume = baseMusicGain * duckFactor
    }

    // ── SFX ─────────────────────────────────────────────────────────────────

    /// Fire-and-forget SFX playback.  Never ducked.
    func playSFX(sfxId: String, volume: Float = 1.0) {
        guard let url = asset(sfxId),
              let p   = try? AVAudioPlayer(contentsOf: url) else {
            print("[Audio] sfx not found: \(sfxId)"); return
        }
        p.volume = volume
        p.play()   // AVAudioPlayer retains itself until playback completes
    }

    // ── voice / TTS ─────────────────────────────────────────────────────────

    /// Play a TTS clip; uses prefetch cache if available, else fetches.
    /// Automatically ducks the music bed for the clip duration.
    ///
    /// When *volume* > 1.0 the clip is routed through an AVAudioEngine so that
    /// gain above unity is honoured (AVAudioPlayer clamps to 1.0).
    func playVoice(clipId: String, url: URL, durationMs: Int, volume: Float = 1.0) {
        stopVoice()
        voiceTask?.cancel()
        voiceTask = Task {
            do {
                let data: Data
                if let cached = self.prefetchCache[clipId] {
                    data = cached
                } else {
                    data = try await URLSession.shared.data(from: url).0
                }
                guard !Task.isCancelled else { return }

                if volume > 1.0 {
                    try self.playVoiceViaEngine(data: data, url: url, volume: volume)
                } else {
                    let hint = url.pathExtension == "wav" ? "public.wave" : nil
                    let p    = try AVAudioPlayer(data: data, fileTypeHint: hint)
                    p.volume = volume
                    p.play()
                    self.voicePlayer = p
                }

                self.startDuck()
                // Hold until clip ends, then release
                try await Task.sleep(nanoseconds: Self.ns(Double(durationMs) / 1000))
                self.releaseDuck()
            } catch {
                guard !Task.isCancelled else { return }
                print("[Audio] voice error: \(error)")
            }
        }
    }

    /// Stop active voice clip immediately; releases duck.
    func stopVoice() {
        voicePlayer?.stop()
        voicePlayer = nil
        stopVoiceEngine()
        voiceTask?.cancel()
        voiceTask   = nil
        releaseDuck()
    }

    // ── engine-based voice (volume > 1.0) ───────────────────────────────────

    /// Lazily create and wire the AVAudioEngine graph:
    ///   playerNode → mixerNode (gain) → defaultOutput
    private func ensureEngine() {
        guard engine == nil else { return }
        let e = AVAudioEngine()
        let player = AVAudioPlayerNode()
        let mixer  = AVAudioMixerNode()
        e.attach(player)
        e.attach(mixer)
        e.connect(player, to: mixer, format: nil)
        e.connect(mixer, to: e.mainMixerNode, format: nil)
        try? e.start()
        engine       = e
        enginePlayer = player
        engineMixer  = mixer
    }

    /// Schedule a buffer on the engine player and set the mixer gain.
    private func playVoiceViaEngine(data: Data, url: URL, volume: Float) throws {
        ensureEngine()
        guard let player = enginePlayer, let mixer = engineMixer else {
            throw NSError(domain: "AudioManager", code: 1, userInfo: [NSLocalizedDescriptionKey: "engine init failed"])
        }
        // Derive AVAudioFormat from the raw data via AVAudioFile in memory.
        let tmpURL = URL(fileURLWithPath: NSTemporaryDirectory())
                        .appendingPathComponent("voice_\(ProcessInfo.processInfo.globallyUniqueString).\(url.pathExtension)")
        try data.write(to: tmpURL)
        let file = try AVAudioFile(forReading: tmpURL)
        let buf  = AVAudioPCMBuffer(pcmFormat: file.processingFormat,
                                    frameCapacity: AVAudioFrameCount(file.length))!
        try file.read(into: buf)
        // Clean up temp file
        try? FileManager.default.removeItem(at: tmpURL)

        mixer.outputVolume = volume   // > 1.0 is valid here
        player.play()
        player.scheduleBuffer(buf)
    }

    /// Tear down the engine player (called on stopVoice).
    private func stopVoiceEngine() {
        enginePlayer?.stop()
        // Keep the engine graph alive so it can be reused; only reset gain.
        engineMixer?.outputVolume = 1.0
    }

    // ── prefetch ────────────────────────────────────────────────────────────

    /// Download upcoming TTS clips into memory (TTS_PREFETCH).
    func prefetch(clips: [(id: String, url: URL)]) {
        for c in clips where prefetchCache[c.id] == nil {
            Task {
                if let (data, _) = try? await URLSession.shared.data(from: c.url) {
                    self.prefetchCache[c.id] = data
                }
            }
        }
    }

    // ── duck (private) ──────────────────────────────────────────────────────

    private func startDuck() {
        duckTask?.cancel()
        let from = duckFactor
        duckTask = Task {
            await self.rampDuck(from: from, to: Self.lin(Self.duckDb), dur: Self.duckAttack)
        }
    }

    private func releaseDuck() {
        duckTask?.cancel()
        let from = duckFactor
        duckTask = Task {
            await self.rampDuck(from: from, to: 1.0, dur: Self.duckRelease)
        }
    }

    private func rampDuck(from start: Float, to target: Float, dur: Double) async {
        await ramp(dur: dur) { t in
            self.duckFactor = start + (target - start) * t
            (self.activeIsA ? self.musicA : self.musicB)?.volume =
                self.baseMusicGain * self.duckFactor
        }
        // Snap to exact target to avoid floating-point drift
        duckFactor = target
        (activeIsA ? musicA : musicB)?.volume = baseMusicGain * duckFactor
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    /// Stepped ramp over `dur` seconds (~50 ms ticks).
    /// Calls `body(t)` with t ∈ (0…1].  Returns early if Task is cancelled.
    private func ramp(dur: Double, body: (Float) -> Void) async {
        let secs  = max(0.05, dur)
        let steps = max(1, Int(secs * 20))
        for i in 1...steps {
            if Task.isCancelled { return }
            try? await Task.sleep(nanoseconds: Self.ns(secs / Double(steps)))
            if Task.isCancelled { return }
            body(Float(i) / Float(steps))
        }
    }

    /// Resolve an asset ID to a bundle URL.
    private func asset(_ id: String) -> URL? {
        Bundle.main.url(forResource: id, withExtension: "wav")
    }

    /// dB → linear gain multiplier.
    private static func lin(_ db: Float) -> Float  { pow(10.0, db / 20.0) }
    /// Seconds → nanoseconds.
    private static func ns(_ s: Double)  -> UInt64 { UInt64(s * 1_000_000_000) }
}
