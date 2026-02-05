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

                if appState.followupResults == nil, let fq = appState.followupQuestion, let opts = fq.options {
                    OptionsDisplay(options: opts)
                }

                Spacer()
            }
            .padding(60)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Full-viewport results overlay — stays visible from FOLLOWUP_RESULTS
            // until the next FOLLOWUP_QUESTION_PRESENT clears followupResults.
            // No client-side timer; the 4 s hold is entirely server-controlled.
            if let res = appState.followupResults {
                ResultsOverlay(correctAnswer: res.correctAnswer, rows: res.rows)
            }

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

/// Full-viewport overlay shown from FOLLOWUP_RESULTS until the next
/// FOLLOWUP_QUESTION_PRESENT.  Layout follows design-decisions.md:
///   - Backdrop: rgba(18,18,30,0.85)
///   - Top: correct-answer heading (accent green, large bold)
///   - Below: per-player rows with name, verdict pill, points
///
/// Note (TV deviation): answerText is not forwarded to TV by the server
/// (see GameModels.FollowupResultRow).  The "answer" column from the web
/// spec is therefore omitted; the verdict badge and points carry the row.
private struct ResultsOverlay: View {
    let correctAnswer: String
    let rows         : [FollowupResultRow]

    var body: some View {
        ZStack {
            // backdrop — design-decisions.md: rgba(18,18,30,0.85)
            Color(red: 18.0/255, green: 18.0/255, blue: 30.0/255)
                .opacity(0.85)
                .ignoresSafeArea()

            VStack(spacing: 40) {
                // correct-answer heading — 1.8 rem ~ 64 pt on tvOS
                VStack(spacing: 6) {
                    Text("Rätt svar")
                        .font(.system(size: 36, weight: .medium))
                        .foregroundColor(Color(red: 74.0/255, green: 222.0/255, blue: 128.0/255).opacity(0.7))
                    Text(correctAnswer)
                        .font(.system(size: 64, weight: .bold))
                        .foregroundColor(Color(red: 74.0/255, green: 222.0/255, blue: 128.0/255))
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 48)
                .background(Color(red: 74.0/255, green: 222.0/255, blue: 128.0/255).opacity(0.12))
                .cornerRadius(20)

                // per-player rows
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(rows) { row in
                        FQResultRow(row: row)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Single result row:  Name  [Rätt / Fel badge]  +Xp
///
/// Colours per design-decisions.md token table:
///   correct  border #4ade80 / bg rgba(74,222,128,0.2)
///   incorrect border #f87171 / bg rgba(248,113,113,0.15)
private struct FQResultRow: View {
    let row: FollowupResultRow

    // design-decisions.md palette  (#4ade80 / #f87171)
    private static let correctGreen  = Color(red: 74.0/255,  green: 222.0/255, blue: 128.0/255)
    private static let incorrectRed  = Color(red: 248.0/255, green: 113.0/255, blue: 113.0/255)

    var body: some View {
        HStack(spacing: 20) {
            // name — flex 1 equivalent
            Text(row.playerName)
                .font(.system(size: 32, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity, alignment: .leading)

            // verdict badge pill
            Text(row.isCorrect
                 ? (row.pointsAwarded > 0 ? "Rätt +\(row.pointsAwarded)p" : "Rätt")
                 : "Fel")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(row.isCorrect ? Self.correctGreen : Self.incorrectRed)
                .padding(.horizontal, 20)
                .padding(.vertical, 8)
                .background(row.isCorrect
                    ? Self.correctGreen.opacity(0.2)
                    : Self.incorrectRed.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(row.isCorrect ? Self.correctGreen : Self.incorrectRed,
                                lineWidth: 1.5)
                )
                .cornerRadius(6)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 24)
        .background(
            row.isCorrect
                ? Self.correctGreen.opacity(0.08)
                : Self.incorrectRed.opacity(0.06)
        )
        .cornerRadius(10)
    }
}
