import SwiftUI

/// Shown during SCOREBOARD / ROUND_END / FINAL_RESULTS phases.
/// Two-column layout: left = per-player answer results, right = standings.
struct TVScoreboardView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .top) {
            Color.bg0.ignoresSafeArea()

            VStack(spacing: 0) {
                HStack(spacing: 80) {
                    resultsColumn
                    standingsColumn
                }
                .padding(60)
                .frame(maxHeight: .infinity)

                // "Frågor om {X} väntar…" — visas enbart under SCOREBOARD-pausen
                // innan första followup.  Villkor: phase är SCOREBOARD (inte
                // ROUND_END / FINAL_RESULTS) och destinationName är populerad.
                // Design-decisions.md: centered italic, opacity 0.7, no border.
                if appState.phase == "SCOREBOARD",
                   let dest = appState.destinationName,
                   appState.followupQuestion != nil {
                    followupIncomingBanner(destination: dest)
                }
            }

            if !appState.isConnected { reconnectBanner }

            // "Nytt spel" — bottom-right, visible after game ends (FINAL_RESULTS)
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    NewGameButton()
                }
            }
            .padding(40)
        }
    }

    // MARK: – results (left) ───────────────────────────────────────────────

    @ViewBuilder
    private var resultsColumn: some View {
        VStack(alignment: .leading, spacing: Layout.space24) {
            Text("Resultat")
                .font(.tvH2)  // 48pt Semibold
                .foregroundColor(.txt1)

            if appState.results.isEmpty {
                Text("Inga resultat än…")
                    .font(.tvMeta)  // 28pt
                    .foregroundColor(.txt3)
            } else {
                ForEach(appState.results) { r in
                    ResultRow(result: r)
                        .transition(.opacity.combined(with: .move(edge: .leading)))
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .animation(.slideIn(), value: appState.results.count)
    }

    // MARK: – standings (right) ────────────────────────────────────────────

    @ViewBuilder
    private var standingsColumn: some View {
        VStack(alignment: .leading, spacing: Layout.space24) {
            Text("Poängtabell")
                .font(.tvH2)  // 48pt Semibold
                .foregroundColor(.txt1)

            if appState.scoreboard.isEmpty {
                Text("Inga poäng än…")
                    .font(.tvMeta)  // 28pt
                    .foregroundColor(.txt3)
            } else {
                ForEach(appState.scoreboard.enumerated().map({ $0 }), id: \.offset) { idx, entry in
                    StandingRow(rank: idx + 1, entry: entry)
                        .transition(.opacity.combined(with: .move(edge: .trailing)))
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .animation(.slideIn(duration: AnimationDuration.scoreboardRowSlide), value: appState.scoreboard.map { $0.id })
    }

    // MARK: – followup-incoming banner ──────────────────────────────────────
    // design-decisions.md: centered italic, 1.05 rem (~38 pt tvOS), opacity 0.7.
    // tvOS mirror: subtitle line pinnad till botten, under scoreboard.

    @ViewBuilder
    private func followupIncomingBanner(destination: String) -> some View {
        Text("Frågor om \(destination) väntar…")
            .font(.tvBody)  // 34pt
            .foregroundColor(.txt2)
            .italic()
            .multilineTextAlignment(.center)
            .padding(.bottom, Layout.cardPadding)
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

// MARK: – ResultRow ───────────────────────────────────────────────────────────

/// Single row in the results column: name, answer, correct tick / wrong cross, points.
private struct ResultRow: View {
    let result: PlayerResult

    var body: some View {
        HStack(spacing: Layout.space16) {
            // ✓ / ✗ icon
            Text(result.isCorrect ? "✓" : "✗")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(result.isCorrect ? .statusOk : .statusBad)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(result.playerName)
                    .font(.tvMeta)  // 28pt
                    .foregroundColor(.txt1)
                Text(result.answerText)
                    .font(.tvMeta)  // 28pt
                    .foregroundColor(.txt2)
            }

            Spacer()

            // points badge
            Text("+\(result.pointsAwarded)")
                .font(.tvMeta)  // 28pt
                .foregroundColor(.accOrange)
        }
        .padding(.vertical, Layout.space16)
        .padding(.horizontal, Layout.space24)
        .background(
            result.isCorrect
                ? Color.statusOk.opacity(0.08)
                : Color.statusBad.opacity(0.03)
        )
        .cornerRadius(Layout.radiusS)
    }
}

// MARK: – StandingRow ─────────────────────────────────────────────────────────

/// Single row in the standings column: rank number, name, total score.
private struct StandingRow: View {
    let rank : Int
    let entry: ScoreboardEntry

    var body: some View {
        HStack(spacing: Layout.space16) {
            // rank badge
            ZStack {
                Circle()
                    .fill(rankColor)
                    .frame(width: 44, height: 44)
                Text("\(rank)")
                    .font(.tvMeta)  // 28pt
                    .foregroundColor(.bg0)
            }

            Text(entry.name)
                .font(.tvBody)  // 34pt
                .foregroundColor(.txt1)

            Spacer()

            Text("\(entry.totalScore)")
                .font(.tvH2)  // 48pt Semibold
                .foregroundColor(.accOrange)
        }
        .padding(.vertical, Layout.space16)
        .padding(.horizontal, rank == 1 ? Layout.space24 : 0)
        .background(
            rank == 1
                ? Color.bg1
                : Color.clear
        )
        .overlay(
            Rectangle()
                .fill(rank == 1 ? Color.accOrange : Color.clear)
                .frame(width: 6),
            alignment: .leading
        )
        .cornerRadius(Layout.radiusL)
    }

    /// Gold / silver / bronze for top 3; neutral for the rest.
    private var rankColor: Color {
        switch rank {
        case 1: return .accOrange
        case 2: return .accMint
        case 3: return .accBlue
        default: return .txt3
        }
    }
}
