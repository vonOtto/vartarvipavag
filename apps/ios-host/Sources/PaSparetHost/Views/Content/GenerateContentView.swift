import SwiftUI

// MARK: – Generate Content View ─────────────────────────────────────────────────

/// View for generating a new content pack.
/// Shows progress and polls backend until generation completes.
struct GenerateContentView: View {
    @Environment(\.dismiss) private var dismiss
    let onComplete: () -> Void

    @State private var generateId: String?
    @State private var status: GenerationStatus?
    @State private var errorMessage: String?
    @State private var isGenerating = false
    @State private var pollTimer: Timer?

    var body: some View {
        NavigationView {
            ZStack {
                Color.bg0.ignoresSafeArea()

                VStack(spacing: Layout.space4) {
                    if let error = errorMessage {
                        errorView(error)
                    } else if let status = status {
                        progressView(status)
                    } else {
                        readyView
                    }
                }
                .padding(Layout.space3)
            }
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .principal) {
                    Text("Generera Innehåll")
                        .font(.headline)
                        .foregroundColor(.txt1)
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    if !isGenerating {
                        Button("Avbryt") {
                            hapticImpact(.light)
                            dismiss()
                        }
                        .foregroundColor(.txt1)
                    }
                }
                #endif
            }
        }
        .onDisappear {
            stopPolling()
        }
    }

    // MARK: – Sub-views ───────────────────────────────────────────────────────────

    private var readyView: some View {
        VStack(spacing: Layout.space3) {
            Image(systemName: "wand.and.stars")
                .font(.system(size: 72, weight: .light))
                .foregroundColor(.accMint)

            Text("Skapa nytt innehåll")
                .font(.h1)
                .foregroundColor(.txt1)

            Text("AI:n genererar en destination med ledtrådar och följdfrågor. Detta kan ta 30-60 sekunder.")
                .font(.body)
                .foregroundColor(.txt2)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: Layout.space1) {
                featureBadge(icon: "checkmark.seal.fill", text: "Faktaverifiering")
                featureBadge(icon: "lock.shield.fill", text: "Anti-leak kontroll")
                featureBadge(icon: "globe.europe.africa.fill", text: "Unika destinationer")
            }
            .padding(.top, Layout.space2)

            Spacer()

            VStack(spacing: Layout.space1) {
                Button {
                    #if os(iOS)
                    hapticImpact(.heavy)
                    #endif
                    Task { await startGeneration() }
                } label: {
                    HStack(spacing: Layout.space2) {
                        Image(systemName: "sparkles")
                        Text("Starta generering")
                    }
                }
                .buttonStyle(.primary)
                .disabled(isGenerating)
                .shadow(color: .accOrange.opacity(0.4), radius: Layout.shadowRadius)

                Text("Beräknad kostnad: ~$0.05")
                    .font(.small)
                    .foregroundColor(.txt3)
            }
        }
    }

    private func progressView(_ status: GenerationStatus) -> some View {
        VStack(spacing: Layout.space4) {
            Spacer()

            // Animated icon
            ZStack {
                Circle()
                    .stroke(Color.accMint.opacity(0.2), lineWidth: 4)
                    .frame(width: 120, height: 120)

                Circle()
                    .trim(from: 0, to: status.progress)
                    .stroke(Color.accMint, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut, value: status.progress)

                Image(systemName: "wand.and.stars")
                    .font(.system(size: 48, weight: .light))
                    .foregroundColor(.accMint)
            }

            // Progress percentage
            Text("\(Int(status.progress * 100))%")
                .font(.h1)
                .foregroundColor(.txt1)

            // Status text
            VStack(spacing: Layout.space1) {
                Text("Genererar innehåll...")
                    .font(.h2)
                    .foregroundColor(.txt1)

                if let description = status.currentStepDescription {
                    Text(description)
                        .font(.body)
                        .foregroundColor(.txt2)
                        .multilineTextAlignment(.center)
                }

                Text("Steg \(status.currentStep) av \(status.totalSteps)")
                    .font(.small)
                    .foregroundColor(.txt3)
            }

            // Progress steps
            progressSteps(status)

            Spacer()
        }
    }

    private func progressSteps(_ status: GenerationStatus) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            progressStep(
                number: 1,
                title: "Väljer destination",
                isActive: status.currentStep >= 1,
                isComplete: status.currentStep > 1
            )
            progressStep(
                number: 2,
                title: "Genererar ledtrådar",
                isActive: status.currentStep >= 2,
                isComplete: status.currentStep > 2
            )
            progressStep(
                number: 3,
                title: "Verifierar fakta",
                isActive: status.currentStep >= 3,
                isComplete: status.currentStep > 3
            )
            progressStep(
                number: 4,
                title: "Skapar följdfrågor",
                isActive: status.currentStep >= 4,
                isComplete: status.currentStep > 4
            )
            progressStep(
                number: 5,
                title: "Anti-leak kontroll",
                isActive: status.currentStep >= 5,
                isComplete: status.currentStep > 5
            )
        }
        .padding(Layout.space2)
        .background(Color.bg1)
        .cornerRadius(Layout.radiusM)
    }

    private func progressStep(number: Int, title: String, isActive: Bool, isComplete: Bool) -> some View {
        HStack(spacing: Layout.space2) {
            ZStack {
                Circle()
                    .fill(isComplete ? Color.stateOk : (isActive ? Color.accMint.opacity(0.2) : Color.bg2))
                    .frame(width: 32, height: 32)

                if isComplete {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.bg0)
                } else {
                    Text("\(number)")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(isActive ? .accMint : .txt3)
                }
            }

            Text(title)
                .font(.body)
                .foregroundColor(isActive ? .txt1 : .txt3)

            Spacer()
        }
    }

    private func featureBadge(icon: String, text: String) -> some View {
        HStack(spacing: Layout.space1) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.accMint)
            Text(text)
                .font(.body)
                .foregroundColor(.txt1)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: Layout.space3) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 72, weight: .light))
                .foregroundColor(.stateBad)

            Text("Generering misslyckades")
                .font(.h2)
                .foregroundColor(.txt1)

            Text(message)
                .font(.body)
                .foregroundColor(.txt2)
                .multilineTextAlignment(.center)

            Button("Stäng") {
                #if os(iOS)
                hapticImpact(.light)
                #endif
                dismiss()
            }
            .buttonStyle(.secondary)
            .padding(.top, Layout.space2)
        }
    }

    // MARK: – Actions ─────────────────────────────────────────────────────────────

    private func startGeneration() async {
        isGenerating = true
        errorMessage = nil

        do {
            let response = try await ContentAPI.generateContent()
            generateId = response.generateId
            startPolling()

            #if os(iOS)
            hapticNotification(.success)
            #endif
        } catch {
            errorMessage = error.localizedDescription
            isGenerating = false

            #if os(iOS)
            hapticNotification(.error)
            #endif
        }
    }

    private func startPolling() {
        pollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
            Task { await pollStatus() }
        }
    }

    private func stopPolling() {
        pollTimer?.invalidate()
        pollTimer = nil
    }

    private func pollStatus() async {
        guard let id = generateId else { return }

        do {
            let newStatus = try await ContentAPI.getGenerationStatus(id: id)
            status = newStatus

            // Check completion
            if newStatus.status == "completed" {
                stopPolling()
                #if os(iOS)
                hapticNotification(.success)
                #endif
                // Wait a moment to show 100% before dismissing
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                dismiss()
                // Call onComplete after dismissing to refresh the content list
                onComplete()
            } else if newStatus.status == "failed" {
                stopPolling()
                errorMessage = newStatus.error ?? "Unknown error"
                #if os(iOS)
                hapticNotification(.error)
                #endif
            }
        } catch {
            // Don't show error on polling failures, just retry
            print("Poll error: \(error)")
        }
    }
}
