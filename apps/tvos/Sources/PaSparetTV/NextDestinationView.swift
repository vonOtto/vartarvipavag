import SwiftUI

/// Transition screen shown between destinations in multi-destination games.
/// Displays destination info with a loading indicator.
struct NextDestinationView: View {
    let destinationName: String
    let destinationCountry: String
    let destinationIndex: Int
    let totalDestinations: Int

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color.accOrange, Color.accMint],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .opacity(0.15)
            .ignoresSafeArea()

            VStack(spacing: 60) {
                // Progress indicator
                Text("Destination \(destinationIndex) / \(totalDestinations)")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundColor(.txt2)

                // Destination info
                VStack(spacing: 24) {
                    Image(systemName: "airplane.departure")
                        .font(.system(size: 120, weight: .light))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.accOrange, Color.accMint],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    Text(destinationName)
                        .font(.system(size: 80, weight: .bold))
                        .foregroundColor(.txt1)

                    Text(destinationCountry)
                        .font(.system(size: 48, weight: .regular))
                        .foregroundColor(.txt2)
                }

                // Next indicator
                HStack(spacing: 16) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .accMint))
                        .scaleEffect(1.5)

                    Text("Förbereder ledtrådar...")
                        .font(.system(size: 32))
                        .foregroundColor(.txt2)
                }
            }
        }
    }
}
