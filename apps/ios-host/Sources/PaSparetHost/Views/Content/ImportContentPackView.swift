import SwiftUI
import UniformTypeIdentifiers

// MARK: – Import Content Pack View ──────────────────────────────────────────────

/// View for importing a content pack from a JSON file.
struct ImportContentPackView: View {
    @Environment(\.dismiss) private var dismiss
    let onComplete: () -> Void

    @State private var isImporting = false
    @State private var showFilePicker = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        NavigationView {
            ZStack {
                Color.bg0.ignoresSafeArea()

                VStack(spacing: Layout.space4) {
                    if let error = errorMessage {
                        errorView(error)
                    } else if let success = successMessage {
                        successView(success)
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
                    Text("Importera Pack")
                        .font(.headline)
                        .foregroundColor(.txt1)
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    if !isImporting {
                        Button("Avbryt") {
                            hapticImpact(.light)
                            dismiss()
                        }
                        .foregroundColor(.txt1)
                    }
                }
                #endif
            }
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [UTType.json],
                allowsMultipleSelection: false
            ) { result in
                Task {
                    await handleFileSelection(result)
                }
            }
        }
    }

    // MARK: – Sub-views ───────────────────────────────────────────────────────────

    private var readyView: some View {
        VStack(spacing: Layout.space3) {
            Image(systemName: "square.and.arrow.down.fill")
                .font(.system(size: 72, weight: .light))
                .foregroundColor(.accBlue)

            Text("Importera Content Pack")
                .font(.h1)
                .foregroundColor(.txt1)

            Text("Välj en JSON-fil med content pack-data. Filen måste följa det förväntade formatet.")
                .font(.body)
                .foregroundColor(.txt2)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: Layout.space1) {
                featureBadge(icon: "checkmark.seal.fill", text: "Validerar struktur")
                featureBadge(icon: "doc.text.fill", text: "JSON-format")
                featureBadge(icon: "arrow.up.doc.fill", text: "Sparas i backend")
            }
            .padding(.top, Layout.space2)

            Spacer()

            Button {
                #if os(iOS)
                hapticImpact(.medium)
                #endif
                showFilePicker = true
            } label: {
                HStack(spacing: Layout.space2) {
                    Image(systemName: "folder")
                    Text("Välj fil")
                }
            }
            .buttonStyle(.primary)
            .disabled(isImporting)
            .shadow(color: .accBlue.opacity(0.4), radius: Layout.shadowRadius)
        }
    }

    private func featureBadge(icon: String, text: String) -> some View {
        HStack(spacing: Layout.space1) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.accBlue)
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

            Text("Import misslyckades")
                .font(.h2)
                .foregroundColor(.txt1)

            Text(message)
                .font(.body)
                .foregroundColor(.txt2)
                .multilineTextAlignment(.center)

            Button("Försök igen") {
                #if os(iOS)
                hapticImpact(.light)
                #endif
                errorMessage = nil
                showFilePicker = true
            }
            .buttonStyle(.secondary)
            .padding(.top, Layout.space2)

            Button("Stäng") {
                #if os(iOS)
                hapticImpact(.light)
                #endif
                dismiss()
            }
            .buttonStyle(.secondary)
        }
    }

    private func successView(_ message: String) -> some View {
        VStack(spacing: Layout.space3) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72, weight: .light))
                .foregroundColor(.stateOk)

            Text("Import lyckades")
                .font(.h2)
                .foregroundColor(.txt1)

            Text(message)
                .font(.body)
                .foregroundColor(.txt2)
                .multilineTextAlignment(.center)

            Button("Klar") {
                #if os(iOS)
                hapticImpact(.light)
                #endif
                onComplete()
                dismiss()
            }
            .buttonStyle(.primary)
            .padding(.top, Layout.space2)
        }
    }

    // MARK: – Actions ─────────────────────────────────────────────────────────────

    private func handleFileSelection(_ result: Result<[URL], Error>) async {
        isImporting = true
        errorMessage = nil
        successMessage = nil

        defer { isImporting = false }

        do {
            guard let fileURL = try result.get().first else {
                errorMessage = "Ingen fil vald"
                return
            }

            // Read the file
            guard fileURL.startAccessingSecurityScopedResource() else {
                errorMessage = "Kunde inte komma åt filen"
                return
            }
            defer { fileURL.stopAccessingSecurityScopedResource() }

            let jsonData = try Data(contentsOf: fileURL)

            // Validate it's valid JSON
            let json = try JSONSerialization.jsonObject(with: jsonData)
            guard let dict = json as? [String: Any] else {
                errorMessage = "Ogiltig JSON-struktur"
                return
            }

            // Basic validation
            guard let roundId = dict["roundId"] as? String else {
                errorMessage = "Saknar roundId i JSON"
                return
            }

            // Import via API
            let importedRoundId = try await ContentAPI.importContentPack(json: jsonData)

            #if os(iOS)
            hapticNotification(.success)
            #endif

            successMessage = "Pack '\(importedRoundId)' har importerats"
        } catch {
            errorMessage = error.localizedDescription
            #if os(iOS)
            hapticNotification(.error)
            #endif
        }
    }
}
