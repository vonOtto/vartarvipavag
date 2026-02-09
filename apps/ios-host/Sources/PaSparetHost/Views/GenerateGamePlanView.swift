import SwiftUI

// MARK: – Generate Game Plan Configuration View

/// Configuration view for AI game plan generation.
/// Allows users to configure:
/// - Number of destinations (3-5)
/// - Regions (multi-select)
/// - Custom prompt (optional)
struct GenerateGamePlanView: View {
    @Environment(\.dismiss) private var dismiss
    let onGenerate: (Int, [String]?, String?) -> Void

    // MARK: – State

    @State private var numDestinations: Int = 3
    @State private var selectedRegions: Set<String> = []
    @State private var customPrompt: String = ""
    @State private var useMixedRegions: Bool = true

    // MARK: – Region definitions

    private let regions: [(id: String, emoji: String, name: String)] = [
        ("Europe", "🌍", "Europa"),
        ("Asia", "🌏", "Asien"),
        ("Africa", "🌍", "Afrika"),
        ("Americas", "🌎", "Amerika"),
        ("Oceania", "🌏", "Oceanien"),
        ("Nordic", "❄️", "Norden")
    ]

    // MARK: – Computed properties

    private var previewText: String {
        let count = numDestinations

        if !customPrompt.trimmingCharacters(in: .whitespaces).isEmpty {
            return "Genererar \(count) destinationer inklusive \"\(customPrompt)\""
        }

        if useMixedRegions || selectedRegions.isEmpty {
            return "Genererar \(count) destinationer (Blandad)"
        }

        let regionNames = selectedRegions.compactMap { id in
            regions.first(where: { $0.id == id })?.name
        }.sorted().joined(separator: " + ")

        return "Genererar \(count) destinationer (\(regionNames))"
    }

    private var canGenerate: Bool {
        true // Always allow generation with current settings
    }

    // MARK: – Body

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Layout.space4) {

                    // MARK: – Header

                    VStack(alignment: .leading, spacing: Layout.space2) {
                        Image(systemName: "wand.and.stars")
                            .font(.system(size: 48, weight: .light))
                            .foregroundColor(.accMint)
                            .frame(maxWidth: .infinity, alignment: .center)

                        Text("Konfigurera AI-generering")
                            .font(.h2)
                            .foregroundColor(.txt1)
                            .frame(maxWidth: .infinity, alignment: .center)

                        Text("Välj hur många destinationer och vilka regioner som ska användas")
                            .font(.body)
                            .foregroundColor(.txt2)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                    .padding(.top, Layout.space2)

                    Divider()
                        .background(Color.line)
                        .padding(.vertical, Layout.space2)

                    // MARK: – Number of destinations

                    VStack(alignment: .leading, spacing: Layout.space2) {
                        Label("Antal destinationer", systemImage: "number.circle")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.txt1)

                        HStack(spacing: Layout.space2) {
                            ForEach(3...5, id: \.self) { num in
                                Button {
                                    #if os(iOS)
                                    hapticImpact(.light)
                                    #endif
                                    numDestinations = num
                                } label: {
                                    Text("\(num)")
                                        .font(.h2)
                                        .foregroundColor(numDestinations == num ? .bg0 : .txt1)
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 56)
                                        .background(numDestinations == num ? Color.accOrange : Color.bg2)
                                        .cornerRadius(Layout.radiusM)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: Layout.radiusM)
                                                .stroke(numDestinations == num ? Color.accOrange : Color.line, lineWidth: 2)
                                        )
                                }
                            }
                        }
                    }

                    Divider()
                        .background(Color.line)
                        .padding(.vertical, Layout.space2)

                    // MARK: – Region selection

                    VStack(alignment: .leading, spacing: Layout.space2) {
                        Label("Regioner", systemImage: "globe")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.txt1)

                        // Mixed regions toggle
                        Button {
                            #if os(iOS)
                            hapticImpact(.light)
                            #endif
                            useMixedRegions.toggle()
                            if useMixedRegions {
                                selectedRegions.removeAll()
                            }
                        } label: {
                            HStack {
                                Image(systemName: useMixedRegions ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 20))
                                    .foregroundColor(useMixedRegions ? .accMint : .txt3)

                                Text("🌐 Blandad (alla regioner)")
                                    .font(.body)
                                    .foregroundColor(.txt1)

                                Spacer()
                            }
                            .padding(.horizontal, Layout.space2)
                            .padding(.vertical, Layout.space2)
                            .background(Color.bg2)
                            .cornerRadius(Layout.radiusM)
                        }

                        if !useMixedRegions {
                            Text("Välj specifika regioner")
                                .font(.small)
                                .foregroundColor(.txt2)
                                .padding(.top, Layout.space1)

                            VStack(spacing: Layout.space1) {
                                ForEach(regions, id: \.id) { region in
                                    RegionToggleRow(
                                        emoji: region.emoji,
                                        name: region.name,
                                        isSelected: selectedRegions.contains(region.id)
                                    ) {
                                        #if os(iOS)
                                        hapticImpact(.light)
                                        #endif
                                        if selectedRegions.contains(region.id) {
                                            selectedRegions.remove(region.id)
                                        } else {
                                            selectedRegions.insert(region.id)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Divider()
                        .background(Color.line)
                        .padding(.vertical, Layout.space2)

                    // MARK: – Custom prompt (advanced)

                    VStack(alignment: .leading, spacing: Layout.space2) {
                        Label("Specifik destination (valfritt)", systemImage: "mappin.circle")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.txt1)

                        Text("T.ex. \"Paris\", \"Tokyo\", eller \"New York\" — inkluderas garanterat")
                            .font(.small)
                            .foregroundColor(.txt2)

                        TextField("Lägg till specifik stad...", text: $customPrompt)
                            .font(.body)
                            .foregroundColor(.txt1)
                            .padding(.horizontal, Layout.space2)
                            .padding(.vertical, Layout.space2)
                            .background(Color.bg2)
                            .cornerRadius(Layout.radiusM)
                            .overlay(
                                RoundedRectangle(cornerRadius: Layout.radiusM)
                                    .stroke(customPrompt.isEmpty ? Color.line : Color.accMint, lineWidth: 2)
                            )
                            #if os(iOS)
                            .autocapitalization(.words)
                            #endif
                            .disableAutocorrection(false)
                    }

                    Divider()
                        .background(Color.line)
                        .padding(.vertical, Layout.space2)

                    // MARK: – Preview

                    VStack(alignment: .leading, spacing: Layout.space2) {
                        Label("Förhandsgranskning", systemImage: "eye")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.txt1)

                        Text(previewText)
                            .font(.body)
                            .foregroundColor(.txt2)
                            .padding(.horizontal, Layout.space2)
                            .padding(.vertical, Layout.space2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.bg2)
                            .cornerRadius(Layout.radiusM)
                    }

                    // MARK: – Warning about generation time

                    HStack(spacing: Layout.space1) {
                        Image(systemName: "clock")
                            .font(.system(size: 14))
                            .foregroundColor(.stateWarn)
                        Text("Genereringen tar 3-6 minuter")
                            .font(.small)
                            .foregroundColor(.stateWarn)
                    }
                    .padding(.horizontal, Layout.space2)
                    .padding(.vertical, Layout.space2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.stateWarn.opacity(0.1))
                    .cornerRadius(Layout.radiusM)

                    Spacer(minLength: Layout.space4)

                    // MARK: – Generate button

                    Button {
                        #if os(iOS)
                        hapticImpact(.heavy)
                        #endif

                        let finalRegions: [String]? = useMixedRegions ? nil : (selectedRegions.isEmpty ? nil : Array(selectedRegions))
                        let finalPrompt: String? = customPrompt.trimmingCharacters(in: .whitespaces).isEmpty ? nil : customPrompt

                        onGenerate(numDestinations, finalRegions, finalPrompt)
                        // Note: LobbyContentView will dismiss when generation completes
                    } label: {
                        HStack(spacing: Layout.space2) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 20, weight: .semibold))
                            Text("Skapa & Generera")
                        }
                    }
                    .buttonStyle(.primary)
                    .disabled(!canGenerate)
                    .opacity(canGenerate ? 1.0 : 0.5)
                    .shadow(color: canGenerate ? .accOrange.opacity(0.4) : .clear, radius: Layout.shadowRadius)
                }
                .padding(.horizontal, Layout.space2)
                .padding(.bottom, Layout.space4)
            }
            .background(Color.bg0)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
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
}

// MARK: – Region Toggle Row

private struct RegionToggleRow: View {
    let emoji: String
    let name: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundColor(isSelected ? .accMint : .txt3)

                Text("\(emoji) \(name)")
                    .font(.body)
                    .foregroundColor(.txt1)

                Spacer()
            }
            .padding(.horizontal, Layout.space2)
            .padding(.vertical, Layout.space2)
            .background(isSelected ? Color.accMint.opacity(0.1) : Color.bg2)
            .cornerRadius(Layout.radiusM)
            .overlay(
                RoundedRectangle(cornerRadius: Layout.radiusM)
                    .stroke(isSelected ? Color.accMint : Color.line, lineWidth: 2)
            )
        }
    }
}
