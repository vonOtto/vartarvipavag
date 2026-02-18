import SwiftUI

/// Shown during FOLLOWUP_QUESTION phase.
/// Fullscreen question text + animated countdown bar.
/// When FOLLOWUP_RESULTS arrives the result overlay replaces the input area.
struct TVFollowupView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .top) {
            Color.bg0.ignoresSafeArea()

            VStack(spacing: Layout.space48) {
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
        if appState.followupResults == nil, let fq = appState.followupQuestion {
            HStack {
                Text("Fråga \(fq.currentQuestionIndex + 1) / \(fq.totalQuestions)")
                    .font(.tvBody)  // 34pt
                    .foregroundColor(.txt2)
                Spacer()
                CountdownLabel(fq: fq, serverOffsetMs: appState.serverTimeOffsetMs)
            }
        }
    }

    // MARK: – animated timer bar ──────────────────────────────────────────────

    @ViewBuilder
    private var timerBar: some View {
        if appState.followupResults == nil, let fq = appState.followupQuestion {
            AnimatedTimerBar(fq: fq, serverOffsetMs: appState.serverTimeOffsetMs)
        }
    }

    // MARK: – question text ───────────────────────────────────────────────────

    @ViewBuilder
    private var questionText: some View {
        if let fq = appState.followupQuestion {
            let hasText = !fq.questionText.isEmpty
            Text(fq.questionText)
                .font(.tvBody)  // 34pt
                .foregroundColor(.txt1)
                .multilineTextAlignment(.center)
                .lineSpacing(8)
                .lineLimit(3)
                .padding(.horizontal, Layout.horizontalPadding)
                .opacity(hasText ? 1 : 0)
                .animation(.fadeIn(duration: AnimationDuration.questionFadeIn), value: fq.questionText)
        }
    }

    // MARK: – reconnect banner ────────────────────────────────────────────────

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

// MARK: – CountdownLabel ──────────────────────────────────────────────────────

/// Ticks every second, derived from server startAt + duration.
private struct CountdownLabel: View {
    let fq: FollowupQuestionInfo
    let serverOffsetMs: Double

    var body: some View {
        TimelineView(.periodic(from: Date(), by: 1.0)) { timeline in
            let serverNowMs = timeline.date.timeIntervalSince1970 * 1000.0 + serverOffsetMs
            let deadlineMs = Double((fq.timerStartMs ?? 0) + (fq.timerDurationMs ?? 0))
            let remaining = max(0, Int(ceil((deadlineMs - serverNowMs) / 1000.0)))
            let isUrgent = remaining <= 10
            let isCritical = remaining <= 3

            Text("\(remaining) s")
                .font(.tvMeta)  // 28pt
                .foregroundColor(isCritical ? .statusBad : (isUrgent ? .statusWarn : .statusOk))
                .padding(.horizontal, Layout.space24)
                .padding(.vertical, Layout.space16)
                .background(
                    Capsule()
                        .fill(Color.bg2)
                )
        }
    }
}

// MARK: – AnimatedTimerBar ────────────────────────────────────────────────────

/// Shrinking progress bar driven by TimelineView (no manual timer needed).
private struct AnimatedTimerBar: View {
    let fq: FollowupQuestionInfo
    let serverOffsetMs: Double

    private var duration: Double {
        guard let ms = fq.timerDurationMs else { return 15.0 }
        return Double(ms) / 1000.0
    }

    var body: some View {
        TimelineView(.periodic(from: Date(), by: 0.2)) { timeline in
            let serverNowMs = timeline.date.timeIntervalSince1970 * 1000.0 + serverOffsetMs
            let startMs = Double(fq.timerStartMs ?? 0)
            let elapsed = max(0, (serverNowMs - startMs) / 1000.0)
            let fraction  = max(0, min(1, 1 - elapsed / duration))
            let urgent    = fraction < 0.2   // last ~3 s of a 15 s timer

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // track
                    Capsule()
                        .fill(Color.bg2)
                        .frame(height: 12)
                    // fill
                    Capsule()
                        .fill(urgent ? Color.statusBad : Color.accMint)
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
        HStack(spacing: Layout.space24) {
            ForEach(options, id: \.self) { opt in
                Text(opt)
                    .font(.tvBody)  // 34pt
                    .foregroundColor(.txt1)
                    .padding(.horizontal, Layout.cardPadding)
                    .padding(.vertical, Layout.space16)
                    .background(Color.bg2)
                    .cornerRadius(Layout.radiusM)
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
            Color.overlayBackdrop
                .ignoresSafeArea()
                .transition(.opacity)
                .animation(.fadeIn(duration: AnimationDuration.resultsOverlayFadeIn), value: true)

            VStack(spacing: 40) {
                // correct-answer heading
                VStack(spacing: 6) {
                    Text("Rätt svar")
                        .font(.tvBody)  // 34pt
                        .foregroundColor(.statusOk)
                    Text(correctAnswer)
                        .font(.tvH2)  // 48pt Semibold
                        .foregroundColor(.statusOk)
                }
                .padding(.vertical, Layout.space16)
                .padding(.horizontal, Layout.space48)
                .background(Color.statusOk.opacity(0.12))
                .cornerRadius(Layout.radiusL)

                // per-player rows
                VStack(alignment: .leading, spacing: Layout.space16) {
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

    var body: some View {
        HStack(spacing: Layout.space24) {
            // name — flex 1 equivalent
            Text(row.playerName)
                .font(.tvBody)  // 34pt
                .foregroundColor(.txt1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // verdict badge pill
            Text(row.isCorrect
                 ? (row.pointsAwarded > 0 ? "Rätt +\(row.pointsAwarded)p" : "Rätt")
                 : "Fel")
                .font(.tvMeta)  // 28pt
                .foregroundColor(row.isCorrect ? .statusOk : .statusBad)
                .padding(.horizontal, Layout.space24)
                .padding(.vertical, Layout.space16)
                .background(row.isCorrect
                    ? Color.statusOk.opacity(0.2)
                    : Color.statusBad.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(row.isCorrect ? Color.statusOk : Color.statusBad,
                                lineWidth: 1.5)
                )
                .cornerRadius(6)
        }
        .padding(.vertical, Layout.space16)
        .padding(.horizontal, Layout.space24)
        .background(
            row.isCorrect
                ? Color.statusOk.opacity(0.08)
                : Color.statusBad.opacity(0.06)
        )
        .cornerRadius(Layout.radiusM)
    }
}
