// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PaSparetTV",
    platforms: [.tvOS(.v16), .macOS(.v11)],   // macOS floor lets `swift build` type-check on host
    targets: [
        .executableTarget(
            name: "PaSparetTV",
            path: "Sources/PaSparetTV"
        )
    ]
)
