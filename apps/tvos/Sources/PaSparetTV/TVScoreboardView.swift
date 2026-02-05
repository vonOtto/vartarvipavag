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
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.white)

            if appState.results.isEmpty {
                Text("Inga resultat än…")
                    .font(.system(size: 24))
                    .foregroundColor(.secondary)
            } else {
                ForEach(appState.results) { r in
                    ResultRow(result: r)
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: – standings (right) ────────────────────────────────────────────

    @ViewBuilder
    private var standingsColumn: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Poängtabell")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.white)

            if appState.scoreboard.isEmpty {
                Text("Inga poäng än…")
                    .font(.system(size: 24))
                    .foregroundColor(.secondary)
            } else {
                ForEach(appState.scoreboard.enumerated().map({ $0 }), id: \.offset) { idx, entry in
                    StandingRow(rank: idx + 1, entry: entry)
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: – followup-incoming banner ──────────────────────────────────────
    // design-decisions.md: centered italic, 1.05 rem (~38 pt tvOS), opacity 0.7.
    // tvOS mirror: subtitle line pinnad till botten, under scoreboard.

    @ViewBuilder
    private func followupIncomingBanner(destination: String) -> some View {
        Text("Frågor om \(destination) väntar…")
            .font(.system(size: 38, weight: .light))
            .foregroundColor(.white)
            .italic()
            .opacity(0.7)
            .multilineTextAlignment(.center)
            .padding(.bottom, 40)
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

// MARK: – ResultRow ───────────────────────────────────────────────────────────

/// Single row in the results column: name, answer, correct tick / wrong cross, points.
private struct ResultRow: View {
    let result: PlayerResult

    var body: some View {
        HStack(spacing: 16) {
            // ✓ / ✗ icon
            Text(result.isCorrect ? "✓" : "✗")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(result.isCorrect ? .green : .red)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(result.playerName)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                Text(result.answerText)
                    .font(.system(size: 22))
                    .foregroundColor(.secondary)
            }

            Spacer()

            // points badge
            Text("+\(result.pointsAwarded)")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.yellow)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
        .background(Color.white.opacity(result.isCorrect ? 0.08 : 0.03))
        .cornerRadius(8)
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
                Text("\(rank)")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.black)
            }

            Text(entry.name)
                .font(.system(size: 28, weight: .medium))
                .foregroundColor(.white)

            Spacer()

            Text("\(entry.totalScore)")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.white)
        }
        .padding(.vertical, 6)
    }

    /// Gold / silver / bronze for top 3; neutral for the rest.
    private var rankColor: Color {
        switch rank {
        case 1: return Color(red: 0.95, green: 0.8,  blue: 0.1)   // gold
        case 2: return Color(red: 0.7,  green: 0.75, blue: 0.8)   // silver
        case 3: return Color(red: 0.8,  green: 0.5,  blue: 0.2)   // bronze
        default: return .gray.opacity(0.5)
        }
    }
}
