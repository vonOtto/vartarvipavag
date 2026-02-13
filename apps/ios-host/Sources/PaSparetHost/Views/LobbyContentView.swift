import SwiftUI

// MARK: – Lobby Content Management View ──────────────────────────────────────

/// Content management UI shown IN the lobby.
/// Allows host to generate or select content WHILE players join.
struct LobbyContentView: View {
    @EnvironmentObject var state: HostState
    @State private var showGenerateSheet = false
    @State private var showSelectSheet = false
    @State private var showContentActionSheet = false
    @State private var replaceContent = true
    @State private var errorMessage: String?
    @State private var generationTask: Task<Void, Never>?
    @State private var showCancelConfirmation = false

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.space2) {
            // Header
            HStack {
                Image(systemName: "tray.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.accMint)
                Text("Innehåll")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(.txt1)
            }

            // Content status
            if state.isGeneratingPlan {
                generatingView
            } else if !state.destinations.isEmpty {
                contentReadyView
            } else {
                noContentView
            }

            // Error message
            if let error = errorMessage {
                errorView(error)
            }
        }
        .sheet(isPresented: $showGenerateSheet) {
            GenerateGamePlanView { numDestinations, regions, prompt in
                // Dismiss sheet immediately so user can see progress in lobby
                showGenerateSheet = false

                // Cancel any existing generation task
                generationTask?.cancel()

                // Start new generation task
                generationTask = Task {
                    do {
                        try await state.generateContentInLobby(
                            numDestinations: numDestinations,
                            regions: regions,
                            prompt: prompt
                        )
                        errorMessage = nil
                        #if os(iOS)
                        hapticNotification(.success)
                        #endif
                    } catch is CancellationError {
                        errorMessage = "Generering avbruten"
                        #if os(iOS)
                        hapticNotification(.warning)
                        #endif
                    } catch {
                        errorMessage = error.localizedDescription
                        #if os(iOS)
                        hapticNotification(.error)
                        #endif
                    }
                    generationTask = nil
                }
            }
        }
        .confirmationDialog("Avbryt generering?", isPresented: $showCancelConfirmation) {
            Button("Ja, avbryt", role: .destructive) {
                generationTask?.cancel()
                state.cancelContentGeneration()
                errorMessage = "Generering avbruten"
                #if os(iOS)
                hapticNotification(.warning)
                #endif
            }
            Button("Fortsätt generera", role: .cancel) { }
        } message: {
            Text("Vill du verkligen avbryta genereringen? Detta kan inte ångras.")
        }
        .sheet(isPresented: $showSelectSheet) {
            ContentPackPickerView(
                maxSelection: replaceContent ? 5 : (5 - state.destinations.count),
                currentSelectionCount: replaceContent ? 0 : state.destinations.count
            ) { packIds in
                // Dismiss sheet immediately so user can see lobby
                showSelectSheet = false

                Task {
                    do {
                        try await state.importContentPacks(packIds, replace: replaceContent)
                        errorMessage = nil
                        #if os(iOS)
                        hapticNotification(.success)
                        #endif
                    } catch {
                        errorMessage = error.localizedDescription
                        #if os(iOS)
                        hapticNotification(.error)
                        #endif
                    }
                }
            }
        }
        .confirmationDialog("Välj åtgärd", isPresented: $showContentActionSheet) {
            Button("Ersätt befintligt innehåll") {
                replaceContent = true
                showSelectSheet = true
            }
            Button("Lägg till fler destinationer") {
                replaceContent = false
                showSelectSheet = true
            }
            Button("Avbryt", role: .cancel) { }
        } message: {
            Text("Du har redan \(state.destinations.count) resmål valda. Vill du ersätta dem eller lägga till fler?")
        }
    }

    // MARK: – Sub-views ───────────────────────────────────────────────────────────

    private var noContentView: some View {
        VStack(spacing: Layout.space2) {
            // Warning banner
            HStack(spacing: Layout.space1) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.stateWarn)
                Text("Inget innehåll valt ännu")
                    .font(.small)
                    .foregroundColor(.stateWarn)
            }
            .padding(.horizontal, Layout.space2)
            .padding(.vertical, Layout.space1)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.stateWarn.opacity(0.1))
            .cornerRadius(Layout.radiusS)

            Text("Välj eller generera innehåll för att kunna starta spelet")
                .font(.small)
                .foregroundColor(.txt2)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Action buttons
            VStack(spacing: Layout.space1) {
                Button {
                    #if os(iOS)
                    hapticImpact(.medium)
                    #endif
                    showGenerateSheet = true
                } label: {
                    HStack(spacing: Layout.space1) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 16))
                        Text("Generera nytt innehåll")
                            .font(.body)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.primary)
                .frame(height: 44)

                Button {
                    #if os(iOS)
                    hapticImpact(.light)
                    #endif
                    showSelectSheet = true
                } label: {
                    HStack(spacing: Layout.space1) {
                        Image(systemName: "folder.fill")
                            .font(.system(size: 16))
                        Text("Välj befintligt innehåll")
                            .font(.body)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.secondary)
                .frame(height: 44)
            }
        }
    }

    private var generatingView: some View {
        VStack(spacing: Layout.space2) {
            // Main progress card
            VStack(spacing: Layout.space3) {
                // Header with spinner
                HStack(spacing: Layout.space2) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .accMint))
                        .scaleEffect(1.2)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Genererar innehåll med AI")
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundColor(.txt1)

                        if let progress = state.generationProgress,
                           let destIndex = progress.destinationIndex,
                           let totalDests = progress.totalDestinations {
                            Text("Destination \(destIndex) av \(totalDests)")
                                .font(.small)
                                .foregroundColor(.txt2)
                        }
                    }

                    Spacer()
                }

                // Progress bar
                if let progress = state.generationProgress {
                    VStack(alignment: .leading, spacing: 8) {
                        // Progress bar
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                // Background
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.bg1)
                                    .frame(height: 8)

                                // Progress fill with animation
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.accMint, Color.accBlue]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: max(geometry.size.width * CGFloat(progress.progress), 20), height: 8)
                                    .animation(.easeInOut(duration: 0.5), value: progress.progress)
                            }
                        }
                        .frame(height: 8)

                        // Progress percentage
                        HStack {
                            Text(progress.stepDescription)
                                .font(.small)
                                .foregroundColor(.txt2)
                                .lineLimit(1)

                            Spacer()

                            Text("\(Int(progress.progress * 100))%")
                                .font(.small)
                                .fontWeight(.medium)
                                .foregroundColor(.accMint)
                        }
                    }
                }

                // Cancel button
                Button {
                    #if os(iOS)
                    hapticImpact(.medium)
                    #endif
                    showCancelConfirmation = true
                } label: {
                    HStack(spacing: Layout.space1) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                        Text("Avbryt generering")
                            .font(.body)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.secondary)
                .frame(height: 44)
            }
            .padding(.horizontal, Layout.space2)
            .padding(.vertical, Layout.space3)
            .background(
                RoundedRectangle(cornerRadius: Layout.radiusM)
                    .fill(Color.bg2)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            )

            // Info message
            HStack(spacing: Layout.space1) {
                Image(systemName: "info.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.accBlue)
                Text("Detta kan ta 3-6 minuter. Spelare kan fortsätta ansluta medan vi genererar.")
                    .font(.small)
                    .foregroundColor(.txt2)
            }
            .padding(.horizontal, Layout.space2)
            .padding(.vertical, Layout.space1)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.accBlue.opacity(0.08))
            .cornerRadius(Layout.radiusS)
        }
    }

    private var contentReadyView: some View {
        VStack(spacing: Layout.space2) {
            // Success banner
            HStack(spacing: Layout.space1) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.stateOk)
                Text("Redo med \(state.destinations.count) resmål")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(.txt1)
                Spacer()
            }
            .padding(.horizontal, Layout.space2)
            .padding(.vertical, Layout.space2)
            .background(Color.stateOk.opacity(0.1))
            .cornerRadius(Layout.radiusM)

            // Destination preview
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Layout.space1) {
                    ForEach(Array(state.destinations.enumerated()), id: \.offset) { index, dest in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(index + 1). \(dest.name)")
                                .font(.small)
                                .fontWeight(.medium)
                                .foregroundColor(.txt1)
                            Text(dest.country)
                                .font(.system(size: 11))
                                .foregroundColor(.txt2)
                        }
                        .padding(.horizontal, Layout.space2)
                        .padding(.vertical, Layout.space1)
                        .background(Color.bg2)
                        .cornerRadius(Layout.radiusS)
                    }
                }
            }

            // Action buttons
            HStack(spacing: Layout.space2) {
                // Rensa allt
                Button {
                    #if os(iOS)
                    hapticImpact(.light)
                    #endif
                    state.destinations = []
                    state.gamePlan = nil
                } label: {
                    HStack(spacing: Layout.space1) {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                        Text("Rensa")
                            .font(.small)
                    }
                    .foregroundColor(.stateBad)
                }

                Spacer()

                // Generera nytt
                Button {
                    #if os(iOS)
                    hapticImpact(.light)
                    #endif
                    showGenerateSheet = true
                } label: {
                    HStack(spacing: Layout.space1) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 14))
                        Text("Generera nytt")
                            .font(.small)
                    }
                    .foregroundColor(.accOrange)
                }

                // Välj från bibliotek
                Button {
                    #if os(iOS)
                    hapticImpact(.light)
                    #endif
                    // If content exists, ask if replace or add
                    if !state.destinations.isEmpty && state.destinations.count < 5 {
                        showContentActionSheet = true
                    } else {
                        replaceContent = true
                        showSelectSheet = true
                    }
                } label: {
                    HStack(spacing: Layout.space1) {
                        Image(systemName: "folder.fill")
                            .font(.system(size: 14))
                        Text("Välj från bibliotek")
                            .font(.small)
                    }
                    .foregroundColor(.accBlue)
                }
            }
        }
    }

    private func errorView(_ message: String) -> some View {
        HStack(spacing: Layout.space1) {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.stateBad)
            Text(message)
                .font(.small)
                .foregroundColor(.stateBad)
            Spacer()
            Button {
                errorMessage = nil
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12))
                    .foregroundColor(.txt3)
            }
        }
        .padding(.horizontal, Layout.space2)
        .padding(.vertical, Layout.space1)
        .background(Color.stateBad.opacity(0.1))
        .cornerRadius(Layout.radiusS)
    }
}

// MARK: – Content Pack Picker View ───────────────────────────────────────────

/// Modal sheet for selecting existing content packs.
struct ContentPackPickerView: View {
    @Environment(\.dismiss) private var dismiss
    let maxSelection: Int
    let currentSelectionCount: Int
    let onSelect: ([String]) -> Void

    @State private var packs: [ContentPackInfo] = []
    @State private var selectedIds: Set<String> = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    init(maxSelection: Int = 5, currentSelectionCount: Int = 0, onSelect: @escaping ([String]) -> Void) {
        self.maxSelection = maxSelection
        self.currentSelectionCount = currentSelectionCount
        self.onSelect = onSelect
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.bg0.ignoresSafeArea()

                if isLoading && packs.isEmpty {
                    loadingView
                } else if let error = errorMessage, packs.isEmpty {
                    errorView(error)
                } else if packs.isEmpty {
                    emptyStateView
                } else {
                    packListView
                }
            }
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .principal) {
                    Text("Välj innehåll")
                        .font(.headline)
                        .foregroundColor(.txt1)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Välj") {
                        #if os(iOS)
                        hapticImpact(.medium)
                        #endif
                        onSelect(Array(selectedIds))
                    }
                    .disabled(!isSelectionValid)
                    .foregroundColor(isSelectionValid ? .accOrange : .txt3)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Avbryt") {
                        #if os(iOS)
                        hapticImpact(.light)
                        #endif
                        dismiss()
                    }
                    .foregroundColor(.txt1)
                }
                #endif
            }
            .task {
                await loadPacks()
            }
        }
    }

    // MARK: – Sub-views ───────────────────────────────────────────────────────────

    private var loadingView: some View {
        VStack(spacing: Layout.space3) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .accMint))
                .scaleEffect(1.5)
            Text("Laddar innehåll...")
                .font(.body)
                .foregroundColor(.txt2)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: Layout.space2) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 56, weight: .light))
                .foregroundColor(.stateBad)
            Text("Kunde inte ladda innehåll")
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
                Task { await loadPacks() }
            }
            .buttonStyle(.secondary)
            .padding(.top, Layout.space2)
        }
        .padding(Layout.space3)
    }

    private var emptyStateView: some View {
        VStack(spacing: Layout.space3) {
            Image(systemName: "tray.fill")
                .font(.system(size: 72, weight: .light))
                .foregroundColor(.txt3)
            Text("Inget innehåll än")
                .font(.h2)
                .foregroundColor(.txt1)
            Text("Generera ditt första content pack för att komma igång")
                .font(.body)
                .foregroundColor(.txt2)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Layout.space4)
        }
        .padding(.vertical, Layout.space6)
    }

    private var isSelectionValid: Bool {
        let total = currentSelectionCount + selectedIds.count
        return total >= 1 && total <= 5 && selectedIds.count > 0 && selectedIds.count <= maxSelection
    }

    private var selectionStatusText: String {
        let total = currentSelectionCount + selectedIds.count
        if currentSelectionCount > 0 {
            return "Välj upp till \(maxSelection) fler (\(selectedIds.count) valda, totalt \(total))"
        } else {
            return "Välj 1-5 destinationer (\(selectedIds.count) valda)"
        }
    }

    private var packListView: some View {
        VStack(spacing: 0) {
            // Selection counter
            HStack(spacing: Layout.space2) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(isSelectionValid ? .stateOk : .stateWarn)
                Text(selectionStatusText)
                    .font(.body)
                    .foregroundColor(isSelectionValid ? .txt1 : .stateWarn)
                Spacer()
            }
            .padding(.horizontal, Layout.space2)
            .padding(.vertical, Layout.space2)
            .background(Color.bg1)

            ScrollView {
                VStack(spacing: Layout.space2) {
                    ForEach(packs) { pack in
                        PackSelectionRow(
                            pack: pack,
                            isSelected: selectedIds.contains(pack.roundId)
                        ) {
                            #if os(iOS)
                            hapticImpact(.light)
                            #endif
                            toggleSelection(pack.roundId)
                        }
                    }
                }
                .padding(Layout.space2)
            }
        }
    }

    // MARK: – Actions ─────────────────────────────────────────────────────────────

    private func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            // Only allow selection if we haven't hit the max
            if selectedIds.count < maxSelection {
                selectedIds.insert(id)
            }
        }
    }

    private func loadPacks() async {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            packs = try await ContentAPI.listContentPacks()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: – Pack Selection Row ─────────────────────────────────────────────────

struct PackSelectionRow: View {
    let pack: ContentPackInfo
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Layout.space2) {
                // Selection indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? .accOrange : .txt3)

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(pack.destinationName)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.txt1)
                    Text(pack.destinationCountry)
                        .font(.small)
                        .foregroundColor(.txt2)
                }

                Spacer()
            }
            .padding(Layout.space2)
            .background(
                RoundedRectangle(cornerRadius: Layout.radiusM)
                    .fill(isSelected ? Color.accOrange.opacity(0.1) : Color.bg1)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Layout.radiusM)
                    .stroke(isSelected ? Color.accOrange : Color.line, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}
