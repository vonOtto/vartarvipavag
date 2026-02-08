import SwiftUI

// MARK: – Content Library View ──────────────────────────────────────────────────

/// Main content pack management screen.
/// Shows list of available packs, allows selection for session, and triggers generation.
struct ContentLibraryView: View {
    @EnvironmentObject var state: HostState
    @State private var packs: [ContentPackInfo] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showGenerateView = false
    @State private var selectedPackId: String?

    var body: some View {
        NavigationView {
            ZStack {
                Color.bg0.ignoresSafeArea()

                VStack(spacing: 0) {
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
            }
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .principal) {
                    Text("Innehåll")
                        .font(.headline)
                        .foregroundColor(.txt1)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        hapticImpact(.light)
                        showGenerateView = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.accOrange)
                    }
                }
                #endif
            }
            .sheet(isPresented: $showGenerateView) {
                GenerateContentView(onComplete: {
                    Task { await loadPacks() }
                })
                .environmentObject(state)
            }
            .task {
                await loadPacks()
            }
            .refreshable {
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

            Button {
                #if os(iOS)
                hapticImpact(.medium)
                #endif
                showGenerateView = true
            } label: {
                HStack(spacing: Layout.space2) {
                    Image(systemName: "plus.circle.fill")
                    Text("Generera nytt pack")
                }
            }
            .buttonStyle(.primary)
            .padding(.horizontal, Layout.space3)
            .padding(.top, Layout.space2)
        }
        .padding(.vertical, Layout.space6)
    }

    private var packListView: some View {
        ScrollView {
            VStack(spacing: Layout.space2) {
                ForEach(packs) { pack in
                    NavigationLink(destination: ContentPackDetailView(packId: pack.roundId)) {
                        ContentPackRow(
                            pack: pack,
                            isSelected: state.selectedContentPackId == pack.roundId
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(Layout.space2)
        }
    }

    // MARK: – Actions ─────────────────────────────────────────────────────────────

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

// MARK: – Content Pack Row ──────────────────────────────────────────────────────

struct ContentPackRow: View {
    let pack: ContentPackInfo
    var isSelected: Bool

    var body: some View {
        HStack(spacing: Layout.space2) {
            // Icon
            ZStack {
                Circle()
                    .fill(isSelected ? Color.accOrange.opacity(0.2) : Color.bg2)
                    .frame(width: 56, height: 56)
                Image(systemName: isSelected ? "checkmark.circle.fill" : "globe.europe.africa.fill")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(isSelected ? .accOrange : .accMint)
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(pack.destinationName)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(.txt1)
                Text(pack.destinationCountry)
                    .font(.small)
                    .foregroundColor(.txt2)

                // Status badges
                HStack(spacing: Layout.space1) {
                    if pack.verified {
                        statusBadge(icon: "checkmark.seal.fill", text: "Verifierad", color: .stateOk)
                    }
                    if pack.antiLeakChecked {
                        statusBadge(icon: "lock.shield.fill", text: "Anti-leak", color: .accBlue)
                    }
                }
            }

            Spacer()

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.txt3)
        }
        .padding(Layout.space2)
        .background(
            RoundedRectangle(cornerRadius: Layout.radiusM)
                .fill(isSelected ? Color.accOrange.opacity(0.1) : Color.bg1)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Layout.radiusM)
                .stroke(isSelected ? Color.accOrange : Color.clear, lineWidth: 2)
        )
    }

    private func statusBadge(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
            Text(text)
                .font(.system(size: 11, weight: .medium))
        }
        .foregroundColor(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(color.opacity(0.15))
        .cornerRadius(8)
    }
}
