import SwiftUI

/// TV clue screen.  Shown during CLUE_LEVEL and PAUSED_FOR_BRAKE phases.
/// Never displays the correct destination answer (TV projection rule).
struct TVClueView: View {
    @EnvironmentObject var appState: AppState

    /// Ordered clue levels used for the progress bar.
    private static let levels: [Int] = [10, 8, 6, 4, 2]

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                // ── level badge + progress bar ──
                levelHeader
                    .padding(.top, 48)

                Spacer()

                // ── clue text (centred, couch-readable) ──
                clueBody

                Spacer()

                // ── locked count + brake banner ──
                bottomBar
                    .padding(.bottom, 60)
            }
            .padding(.horizontal, 80)

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
        ZStack {
            Circle()
                .fill(Color.yellow)
                .frame(width: 140, height: 140)
            Text(appState.levelPoints.map { "\($0)" } ?? "–")
                .font(.system(size: 72, weight: .bold))
                .foregroundColor(.black)
        }
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
        Group {
            if let clue = appState.clueText {
                Text(clue)
                    .font(.system(size: 58, weight: .medium))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
            } else {
                Text("Väntar på ledtråd…")
                    .font(.system(size: 48, weight: .light))
                    .foregroundColor(.secondary)
            }
        }
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
            .font(.system(size: 36, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 32)
            .padding(.vertical, 14)
            .background(Color.red.opacity(0.85))
            .cornerRadius(12)
    }

    /// "X / Y players locked" counter.
    private var lockedCountRow: some View {
        let total  = appState.players.count
        let locked = appState.lockedAnswersCount
        return Text("\(locked) / \(total) spelare låsta")
            .font(.system(size: 28))
            .foregroundColor(.secondary)
    }

    // MARK: – reconnect banner ─────────────────────────────────────────────

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.system(size: 22))
            .foregroundColor(.red)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(8)
            .padding(.top, 16)
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
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(state.labelColor)
        }
    }

    private enum SegmentState {
        case passed, current, future

        var color: Color {
            switch self {
            case .passed  : return .yellow.opacity(0.6)
            case .current : return .white
            case .future  : return .gray.opacity(0.3)
            }
        }

        var labelColor: Color {
            switch self {
            case .passed  : return .yellow.opacity(0.7)
            case .current : return .white
            case .future  : return .gray.opacity(0.5)
            }
        }
    }
}
