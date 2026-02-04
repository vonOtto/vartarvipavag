import SwiftUI

/// Shown during FOLLOWUP_QUESTION phase.
/// Fullscreen question text + animated countdown bar.
/// When FOLLOWUP_RESULTS arrives the result overlay replaces the input area.
struct TVFollowupView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 48) {
                progressHeader
                timerBar
                questionText

                if let res = appState.followupResults {
                    ResultsOverlay(correctAnswer: res.correctAnswer, rows: res.rows)
                } else if let fq = appState.followupQuestion, let opts = fq.options {
                    OptionsDisplay(options: opts)
                }

                Spacer()
            }
            .padding(60)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if !appState.isConnected { reconnectBanner }
        }
    }

    // MARK: – progress header ─────────────────────────────────────────────────

    @ViewBuilder
    private var progressHeader: some View {
        if let fq = appState.followupQuestion {
            HStack {
                Text("Fråga \(fq.currentQuestionIndex + 1) / \(fq.totalQuestions)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                CountdownLabel(fq: fq)
            }
        }
    }

    // MARK: – animated timer bar ──────────────────────────────────────────────

    @ViewBuilder
    private var timerBar: some View {
        if let fq = appState.followupQuestion {
            AnimatedTimerBar(fq: fq)
        }
    }

    // MARK: – question text ───────────────────────────────────────────────────

    @ViewBuilder
    private var questionText: some View {
        if let fq = appState.followupQuestion {
            Text(fq.questionText)
                .font(.system(size: 58, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .padding(.horizontal, 80)
        }
    }

    // MARK: – reconnect banner ────────────────────────────────────────────────

    private var reconnectBanner: some View {
        Text("○ Reconnecting…")
            .font(.system(size: 22))
            .foregroundColor(.red)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(8)
            .padding(.top, 16)
    }
}

// MARK: – CountdownLabel ──────────────────────────────────────────────────────

/// Ticks every second, derived from server startAt + duration.
private struct CountdownLabel: View {
    let fq: FollowupQuestionInfo

    private var deadline: Date {
        guard let start = fq.timerStartMs, let dur = fq.timerDurationMs else { return Date() }
        return Date(timeIntervalSince1970: Double(start + dur) / 1000.0)
    }

    var body: some View {
        TimelineView(.periodic(from: Date(), by: 1.0)) { timeline in
            let remaining = max(0, Int(deadline.timeIntervalSince(timeline.date)))
            Text("\(remaining) s")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(remaining <= 3 ? .red : .yellow)
        }
    }
}

// MARK: – AnimatedTimerBar ────────────────────────────────────────────────────

/// Shrinking progress bar driven by TimelineView (no manual timer needed).
private struct AnimatedTimerBar: View {
    let fq: FollowupQuestionInfo

    private var startDate: Date {
        guard let ms = fq.timerStartMs else { return Date() }
        return Date(timeIntervalSince1970: Double(ms) / 1000.0)
    }
    private var duration: Double {
        guard let ms = fq.timerDurationMs else { return 15.0 }
        return Double(ms) / 1000.0
    }

    var body: some View {
        TimelineView(.periodic(from: Date(), by: 0.2)) { timeline in
            let elapsed   = timeline.date.timeIntervalSince(startDate)
            let fraction  = max(0, min(1, 1 - elapsed / duration))
            let urgent    = fraction < 0.2   // last ~3 s of a 15 s timer

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // track
                    Capsule()
                        .fill(Color.white.opacity(0.12))
                        .frame(height: 12)
                    // fill
                    Capsule()
                        .fill(urgent ? Color.red : Color(red: 0.39, green: 0.42, blue: 1.0))
                        .frame(width: geo.size.width * fraction, height: 12)
                }
            }
            .frame(height: 12)
        }
    }
}

// MARK: – OptionsDisplay ─────────────────────────────────────────────────────

/// TV-only: shows MC options as large read-only badges (players tap on phone).
private struct OptionsDisplay: View {
    let options: [String]

    var body: some View {
        HStack(spacing: 24) {
            ForEach(options, id: \.self) { opt in
                Text(opt)
                    .font(.system(size: 36, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 16)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(16)
            }
        }
    }
}

// MARK: – ResultsOverlay ──────────────────────────────────────────────────────

/// Shown after FOLLOWUP_RESULTS: correct answer + summary rows (name, tick/cross, +pts).
/// Never shows answerText — only aggregated correct/incorrect per player.
private struct ResultsOverlay: View {
    let correctAnswer: String
    let rows         : [FollowupResultRow]

    var body: some View {
        VStack(spacing: 32) {
            // correct answer banner
            VStack(spacing: 4) {
                Text("Rätt svar")
                    .font(.system(size: 28))
                    .foregroundColor(.secondary)
                Text(correctAnswer)
                    .font(.system(size: 64, weight: .bold))
                    .foregroundColor(.green)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 40)
            .background(Color.green.opacity(0.12))
            .cornerRadius(16)

            // per-player summary
            VStack(alignment: .leading, spacing: 12) {
                ForEach(rows) { row in
                    FQResultRow(row: row)
                }
            }
        }
    }
}

/// Single row: ✓/✗  Name  +Xp
private struct FQResultRow: View {
    let row: FollowupResultRow

    var body: some View {
        HStack(spacing: 16) {
            Text(row.isCorrect ? "✓" : "✗")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(row.isCorrect ? .green : .red)
                .frame(width: 36)

            Text(row.playerName)
                .font(.system(size: 28, weight: .medium))
                .foregroundColor(.white)

            Spacer()

            Text("+\(row.pointsAwarded)")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.yellow)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 16)
        .background(Color.white.opacity(row.isCorrect ? 0.08 : 0.03))
        .cornerRadius(8)
    }
}
