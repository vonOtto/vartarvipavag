// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PaSparetTV",
    platforms: [.tvOS(.v16), .macOS(.v12)],   // macOS floor lets `swift build` type-check on host; v12 needed for TimelineView
    targets: [
        .executableTarget(
            name: "PaSparetTV",
            path: "Sources/PaSparetTV",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
