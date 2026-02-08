import SwiftUI

/// TV clue screen.  Shown during CLUE_LEVEL and PAUSED_FOR_BRAKE phases.
/// Never displays the correct destination answer (TV projection rule).
struct TVClueView: View {
    @EnvironmentObject var appState: AppState

    /// Ordered clue levels used for the progress bar.
    private static let levels: [Int] = [10, 8, 6, 4, 2]

    var body: some View {
        ZStack(alignment: .top) {
            Color.bg0.ignoresSafeArea()

            VStack(spacing: 0) {
                // ── level badge + progress bar ──
                levelHeader
                    .padding(.top, Layout.verticalPadding)

                Spacer()

                // ── countdown timer (centered above clue) ──
                if appState.clueTimerEnd != nil {
                    VStack(spacing: 12) {
                        CountdownTimer(timerEndMs: appState.clueTimerEnd)

                        // ── answer count badge ──
                        if appState.totalPlayers > 0 {
                            answerCountBadge
                        }
                    }
                    .padding(.bottom, Layout.space24)
                }

                // ── clue text (centred, couch-readable) ──
                clueBody

                Spacer()

                // ── locked count + brake banner ──
                bottomBar
                    .padding(.bottom, Layout.verticalPadding)
            }
            .padding(.horizontal, Layout.horizontalPadding)

            // overlay reconnect banner when socket is down
            if !appState.isConnected { reconnectBanner }
        }
    }

    // MARK: – level header ─────────────────────────────────────────────────

    private var levelHeader: some View {
        HStack(spacing: 40) {
            levelBadge
            levelProgressBar
        }
    }

    /// Large circle showing current level points.
    private var levelBadge: some View {
        let hasClue = appState.clueText != nil && !(appState.clueText?.isEmpty ?? true)
        return ZStack {
            Circle()
                .fill(Color.accOrange)
                .frame(width: 140, height: 140)
            Text(appState.levelPoints.map { "\($0)" } ?? "–")
                .font(.tvH1)  // 72pt Semibold
                .foregroundColor(.bg0)
        }
        .opacity(hasClue ? 1 : 0)
        .scaleEffect(hasClue ? 1.0 : 0.8)
        .animation(.fadeIn(duration: AnimationDuration.levelBadgeFadeIn), value: appState.clueText)
    }

    /// Five-segment bar; current level is white, past levels are dim, future are dark.
    private var levelProgressBar: some View {
        HStack(spacing: 6) {
            ForEach(Self.levels, id: \.self) { pts in
                SegmentView(points: pts,
                            current: appState.levelPoints ?? 0)
            }
        }
    }

    // MARK: – clue body ────────────────────────────────────────────────────

    private var clueBody: some View {
        let hasClue = appState.clueText != nil && !(appState.clueText?.isEmpty ?? true)
        return Group {
            if let clue = appState.clueText, !clue.isEmpty {
                Text(clue)
                    .font(.tvBody)  // 34pt Regular
                    .foregroundColor(.txt1)
                    .multilineTextAlignment(.center)
                    .lineSpacing(8)
                    .lineLimit(4)
                    .opacity(hasClue ? 1 : 0)
                    .offset(y: hasClue ? 0 : 10)
                    .animation(
                        .fadeIn(duration: AnimationDuration.clueTextFadeIn).delay(0.2),
                        value: appState.clueText
                    )
            } else {
                Text("Väntar på ledtråd…")
                    .font(.tvBody)  // 34pt
                    .foregroundColor(.txt3)
            }
        }
        .padding(.horizontal, Layout.horizontalPadding)
        .padding(.vertical, Layout.cardPadding)
        .background(
            RoundedRectangle(cornerRadius: Layout.radiusL)
                .fill(Color.bg1)
                .opacity(hasClue ? 1 : 0)
                .animation(.fadeIn(duration: AnimationDuration.clueBackgroundFadeIn), value: appState.clueText)
        )
    }

    // MARK: – bottom bar ───────────────────────────────────────────────────

    @ViewBuilder
    private var bottomBar: some View {
        VStack(spacing: 16) {
            if let name = appState.brakeOwnerName {
                brakeBanner(playerName: name)
            }
            lockedCountRow
        }
    }

    /// Red banner shown while a player's brake is active.
    private func brakeBanner(playerName: String) -> some View {
        Text("● \(playerName) bromsade!")
            .font(.tvBody)  // 34pt
            .foregroundColor(.txt1)
            .padding(.horizontal, Layout.cardPadding)
            .padding(.vertical, Layout.space16)
            .background(Color.statusBad.opacity(0.85))
            .cornerRadius(Layout.radiusM)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .animation(.easeOut(duration: AnimationDuration.brakeBannerSlide), value: appState.brakeOwnerName)
    }

    /// "X / Y players locked" counter.
    private var lockedCountRow: some View {
        let total  = appState.players.count
        let locked = appState.lockedAnswersCount
        return Text("\(locked) / \(total) spelare låsta")
            .font(.tvMeta)  // 28pt
            .foregroundColor(.txt2)
    }

    /// "X / Y svarat" badge showing answer progress.
    private var answerCountBadge: some View {
        Text("\(appState.answeredCount)/\(appState.totalPlayers) svarat")
            .font(.callout)
            .foregroundColor(.txt1)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.accMint.opacity(0.2))
            .cornerRadius(8)
    }

    // MARK: – reconnect banner ─────────────────────────────────────────────

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.tvMeta)  // 28pt
            .foregroundColor(.txt1)
            .padding(.horizontal, Layout.space24)
            .padding(.vertical, Layout.space16)
            .background(Color.statusBad.opacity(0.9))
            .cornerRadius(Layout.radiusS)
            .padding(.top, Layout.space16)
    }
}

// MARK: – SegmentView ─────────────────────────────────────────────────────────

/// Single segment in the level-progress bar.
/// - current level  → white, full opacity
/// - already passed → yellow, 60 %
/// - not yet reached → dark, 30 %
private struct SegmentView: View {
    let points  : Int   // this segment's point value
    let current : Int   // currently active level points

    private static let levels: [Int] = [10, 8, 6, 4, 2]

    private var state: SegmentState {
        guard let curIdx = Self.levels.firstIndex(of: current),
              let myIdx  = Self.levels.firstIndex(of: points)
        else { return .future }
        if myIdx < curIdx  { return .passed }
        if myIdx == curIdx { return .current }
        return .future
    }

    var body: some View {
        VStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 6)
                .fill(state.color)
                .frame(width: 100, height: 18)
            Text("\(points)")
                .font(.tvMeta)  // 28pt
                .foregroundColor(state.labelColor)
        }
    }

    private enum SegmentState {
        case passed, current, future

        var color: Color {
            switch self {
            case .passed  : return .accOrange.opacity(0.6)
            case .current : return .accMint
            case .future  : return .txt3.opacity(0.3)
            }
        }

        var labelColor: Color {
            switch self {
            case .passed  : return .accOrange
            case .current : return .txt1
            case .future  : return .txt3
            }
        }
    }
}

// MARK: – CountdownTimer ──────────────────────────────────────────────────────

/// Circular countdown timer showing remaining seconds with progress ring.
/// Updates every second. Turns red when < 5 seconds remain.
private struct CountdownTimer: View {
    let timerEndMs: Int?  // Unix timestamp in milliseconds

    @State private var remainingSeconds: Int = 0
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(Color.txt3.opacity(0.3), lineWidth: 6)
                .frame(width: 120, height: 120)

            // Progress ring
            Circle()
                .trim(from: 0, to: progress)
                .stroke(ringColor, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .frame(width: 120, height: 120)
                .rotationEffect(.degrees(-90))
                .animation(.linear(duration: 1.0), value: progress)

            // Time display
            VStack(spacing: 4) {
                Text("\(max(0, remainingSeconds))")
                    .font(.system(size: 48, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(textColor)
                Text("sek")
                    .font(.tvMeta)
                    .foregroundColor(.txt2)
            }
        }
        .onAppear {
            updateRemainingTime()
            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                updateRemainingTime()
            }
        }
        .onDisappear {
            timer?.invalidate()
            timer = nil
        }
    }

    private func updateRemainingTime() {
        guard let endMs = timerEndMs else {
            remainingSeconds = 0
            return
        }

        let nowMs = Int(Date().timeIntervalSince1970 * 1000)
        let diff = endMs - nowMs
        remainingSeconds = max(0, diff / 1000)
    }

    private var progress: CGFloat {
        guard timerEndMs != nil else { return 0 }

        // Assume typical timer duration is 14 seconds (can be adjusted)
        let totalDuration: Double = 14.0
        let fraction = Double(remainingSeconds) / totalDuration
        return CGFloat(min(1.0, max(0.0, fraction)))
    }

    private var isLowTime: Bool {
        remainingSeconds < 5
    }

    private var ringColor: Color {
        isLowTime ? .statusBad : .accMint
    }

    private var textColor: Color {
        isLowTime ? .statusBad : .txt1
    }
}
