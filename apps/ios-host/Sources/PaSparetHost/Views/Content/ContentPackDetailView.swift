import SwiftUI

// MARK: – Content Pack Detail View ──────────────────────────────────────────────

/// Full preview of a content pack with all clues and followup questions.
/// Allows selecting the pack for the current session or deleting it.
struct ContentPackDetailView: View {
    @EnvironmentObject var state: HostState
    @Environment(\.dismiss) private var dismiss

    let packId: String

    @State private var pack: ContentPack?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showDeleteConfirmation = false
    @State private var isDeleting = false
    @State private var showShareSheet = false
    @State private var exportedTemplateURL: URL?

    var body: some View {
        ZStack {
            Color.bg0.ignoresSafeArea()

            if isLoading {
                loadingView
            } else if let error = errorMessage {
                errorView(error)
            } else if let pack = pack {
                packDetailView(pack)
            }
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            #if os(iOS)
            ToolbarItem(placement: .principal) {
                Text(pack?.destination.name ?? "Content Pack")
                    .font(.headline)
                    .foregroundColor(.txt1)
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: Layout.space2) {
                    Button {
                        hapticImpact(.light)
                        exportTemplate()
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(.accBlue)
                    }
                    .disabled(isDeleting)

                    Button {
                        hapticImpact(.light)
                        showDeleteConfirmation = true
                    } label: {
                        Image(systemName: "trash")
                            .foregroundColor(.stateBad)
                    }
                    .disabled(isDeleting)
                }
            }
            #endif
        }
        .alert("Ta bort pack?", isPresented: $showDeleteConfirmation) {
            Button("Avbryt", role: .cancel) { }
            Button("Ta bort", role: .destructive) {
                Task { await deletePack() }
            }
        } message: {
            Text("Detta går inte att ångra.")
        }
        #if os(iOS)
        .sheet(isPresented: $showShareSheet) {
            if let url = exportedTemplateURL {
                ShareSheet(items: [url])
            }
        }
        #endif
        .task {
            await loadPack()
        }
    }

    // MARK: – Sub-views ───────────────────────────────────────────────────────────

    private var loadingView: some View {
        VStack(spacing: Layout.space3) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .accMint))
                .scaleEffect(1.5)
            Text("Laddar pack...")
                .font(.body)
                .foregroundColor(.txt2)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: Layout.space2) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 56, weight: .light))
                .foregroundColor(.stateBad)
            Text("Kunde inte ladda pack")
                .font(.h2)
                .foregroundColor(.txt1)
            Text(message)
                .font(.body)
                .foregroundColor(.txt2)
                .multilineTextAlignment(.center)
        }
        .padding(Layout.space3)
    }

    private func packDetailView(_ pack: ContentPack) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.space3) {
                // Destination header
                destinationCard(pack.destination)

                // Metadata
                metadataSection(pack.metadata)

                // Clues section
                cluesSection(pack.clues)

                // Followup questions section
                followupQuestionsSection(pack.followupQuestions)

                Spacer(minLength: Layout.space4)

                // Action buttons
                actionButtons
            }
            .padding(Layout.space2)
        }
    }

    private func destinationCard(_ destination: ContentDestination) -> some View {
        VStack(alignment: .leading, spacing: Layout.space1) {
            Label("Destination", systemImage: "globe.europe.africa.fill")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)

            Text(destination.name)
                .font(.h1)
                .foregroundColor(.txt1)

            Text(destination.country)
                .font(.body)
                .foregroundColor(.txt2)
        }
        .padding(Layout.space3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.accMint.opacity(0.15), Color.accBlue.opacity(0.15)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(Layout.radiusL)
    }

    private func metadataSection(_ metadata: ContentMetadata) -> some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            Label("Metadata", systemImage: "info.circle")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)

            HStack(spacing: Layout.space2) {
                metadataBadge(
                    icon: metadata.verified ? "checkmark.seal.fill" : "xmark.seal.fill",
                    text: "Verifierad",
                    active: metadata.verified
                )
                metadataBadge(
                    icon: metadata.antiLeakChecked ? "lock.shield.fill" : "lock.open.fill",
                    text: "Anti-leak",
                    active: metadata.antiLeakChecked
                )
            }

            Text("Genererad: \(formatDate(metadata.generatedAt))")
                .font(.small)
                .foregroundColor(.txt2)
        }
    }

    private func metadataBadge(icon: String, text: String, active: Bool) -> some View {
        HStack(spacing: Layout.space1) {
            Image(systemName: icon)
                .font(.system(size: 14))
            Text(text)
                .font(.small)
        }
        .foregroundColor(active ? .stateOk : .txt3)
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space1)
        .background(active ? Color.stateOk.opacity(0.15) : Color.bg1)
        .cornerRadius(20)
    }

    private func cluesSection(_ clues: [ContentClue]) -> some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            Label("Ledtrådar (\(clues.count))", systemImage: "list.bullet")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)

            ForEach(Array(clues.enumerated()), id: \.offset) { index, clue in
                VStack(alignment: .leading, spacing: Layout.space1) {
                    HStack {
                        Text("Ledtråd \(index + 1)")
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundColor(.txt1)
                        Spacer()
                        Text("\(clue.points) p")
                            .font(.small)
                            .fontWeight(.bold)
                            .foregroundColor(.stateWarn)
                            .padding(.horizontal, Layout.space1)
                            .padding(.vertical, 4)
                            .background(Color.stateWarn.opacity(0.2))
                            .cornerRadius(8)
                    }
                    Text(clue.text)
                        .font(.body)
                        .foregroundColor(.txt2)
                }
                .padding(Layout.space2)
                .background(Color.bg1)
                .cornerRadius(Layout.radiusM)
            }
        }
    }

    private func followupQuestionsSection(_ questions: [ContentFollowupQuestion]) -> some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            Label("Följdfrågor (\(questions.count))", systemImage: "questionmark.circle")
                .font(.small)
                .foregroundColor(.txt2)
                .textCase(.uppercase)

            ForEach(Array(questions.enumerated()), id: \.offset) { index, question in
                VStack(alignment: .leading, spacing: Layout.space2) {
                    Text("Fråga \(index + 1)")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.txt1)

                    Text(question.questionText)
                        .font(.body)
                        .foregroundColor(.txt2)

                    if let options = question.options {
                        VStack(alignment: .leading, spacing: Layout.space1) {
                            Text("Alternativ:")
                                .font(.small)
                                .foregroundColor(.txt2)
                            ForEach(options, id: \.self) { option in
                                Text("• \(option)")
                                    .font(.small)
                                    .foregroundColor(.txt2)
                            }
                        }
                    }

                    HStack {
                        Text("Rätt svar:")
                            .font(.small)
                            .foregroundColor(.txt2)
                        Text(question.correctAnswer)
                            .font(.small)
                            .fontWeight(.semibold)
                            .foregroundColor(.stateOk)
                    }
                    .padding(.horizontal, Layout.space2)
                    .padding(.vertical, Layout.space1)
                    .background(Color.stateOk.opacity(0.1))
                    .cornerRadius(8)
                }
                .padding(Layout.space2)
                .background(Color.bg1)
                .cornerRadius(Layout.radiusM)
            }
        }
    }

    private var actionButtons: some View {
        VStack(spacing: Layout.space2) {
            Button {
                #if os(iOS)
                hapticImpact(.medium)
                #endif
                state.selectContentPack(packId)
                dismiss()
            } label: {
                HStack(spacing: Layout.space2) {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Använd detta pack")
                }
            }
            .buttonStyle(.primary)
            .shadow(color: .accOrange.opacity(0.4), radius: Layout.shadowRadius)
        }
        .padding(.bottom, Layout.space4)
    }

    // MARK: – Actions ─────────────────────────────────────────────────────────────

    private func loadPack() async {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            pack = try await ContentAPI.getContentPack(id: packId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deletePack() async {
        isDeleting = true

        defer { isDeleting = false }

        do {
            try await ContentAPI.deleteContentPack(id: packId)
            #if os(iOS)
            hapticNotification(.success)
            #endif
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            #if os(iOS)
            hapticNotification(.error)
            #endif
        }
    }

    private func exportTemplate() {
        // Create a template JSON structure
        let template: [String: Any] = [
            "roundId": "example-destination-001",
            "destination": [
                "name": "Example Destination",
                "country": "Example Country",
                "aliases": ["example", "destination"]
            ],
            "clues": [
                [
                    "level": 10,
                    "text": "This is the first clue (10 points)"
                ],
                [
                    "level": 8,
                    "text": "This is the second clue (8 points)"
                ],
                [
                    "level": 6,
                    "text": "This is the third clue (6 points)"
                ],
                [
                    "level": 4,
                    "text": "This is the fourth clue (4 points)"
                ],
                [
                    "level": 2,
                    "text": "This is the fifth clue (2 points)"
                ]
            ],
            "followups": [
                [
                    "questionText": "Example multiple choice question?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": "Option A",
                    "aliases": ["a", "option a"]
                ],
                [
                    "questionText": "Example open-text question?",
                    "options": NSNull(),
                    "correctAnswer": "Example answer",
                    "aliases": ["example"]
                ]
            ],
            "metadata": [
                "generatedAt": ISO8601DateFormatter().string(from: Date()),
                "verified": true,
                "antiLeakChecked": true
            ]
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: template, options: [.prettyPrinted, .sortedKeys])

            // Write to temporary file
            let tempDir = FileManager.default.temporaryDirectory
            let fileURL = tempDir.appendingPathComponent("content-pack-template.json")
            try jsonData.write(to: fileURL)

            exportedTemplateURL = fileURL
            showShareSheet = true

            #if os(iOS)
            hapticNotification(.success)
            #endif
        } catch {
            errorMessage = "Kunde inte exportera template: \(error.localizedDescription)"
            #if os(iOS)
            hapticNotification(.error)
            #endif
        }
    }

    // MARK: – Helpers ─────────────────────────────────────────────────────────────

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else {
            return isoString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

// MARK: – ShareSheet ────────────────────────────────────────────────────────────

#if os(iOS)
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {
        // No updates needed
    }
}
#endif
