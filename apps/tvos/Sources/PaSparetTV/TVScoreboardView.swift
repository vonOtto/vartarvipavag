import SwiftUI

/// Shown during SCOREBOARD / ROUND_END / FINAL_RESULTS phases.
/// Two-column layout: left = per-player answer results, right = standings.
struct TVScoreboardView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .top) {
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

            // "Ny spel" — bottom-right, visible after game ends (FINAL_RESULTS)
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
        VStack(alignment: .leading, spacing: 20) {
            Text("Resultat")
                .font(.gameShowSubheading)
                .foregroundColor(.accentBlueBright)
                .shadow(color: .black.opacity(Layout.textShadowOpacity), radius: Layout.textShadowRadius)

            if appState.results.isEmpty {
                Text("Inga resultat än…")
                    .font(.bodySmall)
                    .foregroundColor(.white.opacity(0.5))
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
        VStack(alignment: .leading, spacing: 20) {
            Text("Poängtabell")
                .font(.gameShowSubheading)
                .foregroundColor(.accentBlueBright)
                .shadow(color: .black.opacity(Layout.textShadowOpacity), radius: Layout.textShadowRadius)

            if appState.scoreboard.isEmpty {
                Text("Inga poäng än…")
                    .font(.bodySmall)
                    .foregroundColor(.white.opacity(0.5))
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
            .font(.scoreboardName)
            .foregroundColor(.white)
            .italic()
            .opacity(0.7)
            .multilineTextAlignment(.center)
            .padding(.bottom, Layout.cardPadding)
    }

    // MARK: – reconnect banner ─────────────────────────────────────────────

    private var reconnectBanner: some View {
        Text("○ Återansluter…")
            .font(.label)
            .foregroundColor(.errorRed)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(Layout.cornerRadiusSmall)
            .padding(.top, Layout.tightSpacing)
    }
}

// MARK: – ResultRow ───────────────────────────────────────────────────────────

/// Single row in the results column: name, answer, correct tick / wrong cross, points.
private struct ResultRow: View {
    let result: PlayerResult

    var body: some View {
        HStack(spacing: 16) {
            // ✓ / ✗ icon
            Text(result.isCorrect ? "✓" : "✗")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(result.isCorrect ? .successGreenBright : .errorRedBright)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(result.playerName)
                    .font(.bodySmall)
                    .foregroundColor(.white)
                Text(result.answerText)
                    .font(.label)
                    .foregroundColor(.white.opacity(0.7))
            }

            Spacer()

            // points badge
            Text("+\(result.pointsAwarded)")
                .font(.bodySmall)
                .foregroundColor(.goldYellow)
                .shadow(color: .goldYellow.opacity(0.3), radius: Layout.shadowRadius / 4)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
        .background(
            result.isCorrect
                ? Color.successGreen.opacity(0.08)
                : Color.errorRed.opacity(0.03)
        )
        .cornerRadius(Layout.cornerRadiusSmall)
    }
}

// MARK: – StandingRow ─────────────────────────────────────────────────────────

/// Single row in the standings column: rank number, name, total score.
private struct StandingRow: View {
    let rank : Int
    let entry: ScoreboardEntry

    var body: some View {
        HStack(spacing: 16) {
            // rank badge
            ZStack {
                Circle()
                    .fill(rankColor)
                    .frame(width: 44, height: 44)
                    .shadow(
                        color: rank == 1 ? Color.goldYellow.opacity(0.5) : .clear,
                        radius: Layout.shadowRadius / 3
                    )
                Text("\(rank)")
                    .font(.label)
                    .foregroundColor(.black)
            }

            Text(entry.name)
                .font(.scoreboardName)
                .foregroundColor(.white)

            Spacer()

            Text("\(entry.totalScore)")
                .font(.scoreboardPoints)
                .foregroundColor(.white)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, rank == 1 ? 12 : 0)
        .background(
            rank == 1
                ? Color.goldYellow.opacity(0.15)
                : Color.clear
        )
        .overlay(
            Rectangle()
                .fill(rank == 1 ? Color.goldYellow : Color.clear)
                .frame(width: 6),
            alignment: .leading
        )
        .cornerRadius(Layout.cornerRadiusSmall)
    }

    /// Gold / silver / bronze for top 3; neutral for the rest.
    private var rankColor: Color {
        switch rank {
        case 1: return .goldYellow
        case 2: return .silverGray
        case 3: return .bronzeOrange
        default: return .gray.opacity(0.5)
        }
    }
}
