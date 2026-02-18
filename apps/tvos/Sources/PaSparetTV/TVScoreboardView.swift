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
            // FINAL_RESULTS podium (stage-gated)
            if appState.phase == "FINAL_RESULTS",
               ["third", "second", "first", "full"].contains(appState.finalResultsStage) {
                PodiumView(entries: appState.scoreboard, stage: appState.finalResultsStage)
                    .padding(.bottom, Layout.space24)
                    .transition(.opacity.combined(with: .scale))
            }

            // Destination progress header (if multi-destination game)
            if let index = appState.destinationIndex,
               let total = appState.totalDestinations,
               total > 1 {
                HStack(spacing: 16) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.accMint)

                    Text("Destination \(index) / \(total)")
                        .font(.system(size: 40, weight: .semibold))
                        .foregroundColor(.txt1)

                    if appState.nextDestinationAvailable {
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.accOrange)
                    }
                }
                .padding(.bottom, Layout.space16)
            }

            if appState.phase != "FINAL_RESULTS" || appState.finalResultsStage == "full" {
                Text("Poängtabell")
                    .font(.tvH2)  // 48pt Semibold
                    .foregroundColor(.txt1)
            }

            if appState.phase != "FINAL_RESULTS" || appState.finalResultsStage == "full" {
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
            }

            // "Nästa destination kommer!" banner
            if appState.nextDestinationAvailable {
                HStack(spacing: 20) {
                    Image(systemName: "airplane.departure")
                        .font(.system(size: 48))
                        .foregroundColor(.accOrange)

                    Text("Nästa destination kommer snart…")
                        .font(.system(size: 44, weight: .medium))
                        .foregroundColor(.txt1)

                    Image(systemName: "airplane.arrival")
                        .font(.system(size: 48))
                        .foregroundColor(.accMint)
                }
                .padding(.top, 60)
                .padding(.horizontal, 60)
                .padding(.vertical, 40)
                .background(Color.accOrange.opacity(0.1))
                .cornerRadius(24)
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
        VStack(spacing: 8) {
            Text("Bonusfrågor på gång")
                .font(.tvMeta)  // 28pt
                .foregroundColor(.txt2)
                .textCase(.uppercase)
                .tracking(1)
            Text("Frågor om \(destination) väntar…")
                .font(.tvBody)  // 34pt
                .foregroundColor(.txt2)
                .italic()
                .multilineTextAlignment(.center)
        }
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

// MARK: – PodiumView ──────────────────────────────────────────────────────────

private struct PodiumView: View {
    let entries: [ScoreboardEntry]
    let stage: String

    private var topThree: [ScoreboardEntry] {
        Array(entries.sorted { $0.totalScore > $1.totalScore }.prefix(3))
    }

    private var orderedRanks: [(rank: Int, entry: ScoreboardEntry)] {
        let first: ScoreboardEntry?  = topThree.indices.contains(0) ? topThree[0] : nil
        let second: ScoreboardEntry? = topThree.indices.contains(1) ? topThree[1] : nil
        let third: ScoreboardEntry?  = topThree.indices.contains(2) ? topThree[2] : nil
        let rankMap: [Int: ScoreboardEntry] = [
            1: first,
            2: second,
            3: third,
        ].compactMapValues { $0 }
        return [3, 2, 1].compactMap { rank in
            guard let entry = rankMap[rank] else { return nil }
            return (rank, entry)
        }
    }

    private func isVisible(rank: Int) -> Bool {
        switch stage {
        case "third":  return rank == 3
        case "second": return rank >= 2
        case "first", "full": return true
        default: return false
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.space16) {
            let isSolo = topThree.count == 1
            Text(isSolo ? "Ensam vinnare" : "Slutställning")
                .font(.tvMeta)  // 28pt
                .foregroundColor(.txt2)
                .textCase(.uppercase)
                .tracking(1)
            if isSolo {
                Text("En värdig seger — allt mot alla och du vann.")
                    .font(.tvBody)
                    .foregroundColor(.txt1)
            }

            HStack(spacing: Layout.space24) {
                ForEach(orderedRanks, id: \.rank) { item in
                    if isVisible(rank: item.rank) {
                    VStack(spacing: Layout.space8) {
                        ZStack {
                            Circle()
                                .fill(rankColor(item.rank))
                                .frame(width: 56, height: 56)
                            Text("\(item.rank)")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.bg0)
                        }
                        Text(item.entry.name)
                            .font(.tvBody)
                            .foregroundColor(.txt1)
                            .lineLimit(1)
                        Text("\(item.entry.totalScore) p")
                            .font(.tvMeta)
                            .foregroundColor(.txt2)
                    }
                    .padding(Layout.space16)
                    .background(Color.bg1)
                    .cornerRadius(Layout.radiusM)
                    .shadow(color: (item.rank == 1 && (stage == "first" || stage == "full")) ? Color.accOrange.opacity(0.6) : .clear,
                            radius: (item.rank == 1 && (stage == "first" || stage == "full")) ? 22 : 0)
                    .opacity(isVisible(rank: item.rank) ? 1 : 0)
                    .scaleEffect(isVisible(rank: item.rank) ? 1 : 0.96)
                    .offset(y: isVisible(rank: item.rank) ? 0 : 10)
                    .animation(.easeOut(duration: 0.55)
                        .delay(Double(orderedRanks.firstIndex { $0.rank == item.rank } ?? 0) * 0.2),
                        value: stage)
                    }
                }
            }
        }
    }

    private func rankColor(_ rank: Int) -> Color {
        switch rank {
        case 1: return .accOrange
        case 2: return .accBlue
        case 3: return .accMint
        default: return .txt3
        }
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
