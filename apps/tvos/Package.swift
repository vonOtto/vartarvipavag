// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Tripto",
    platforms: [.tvOS(.v17), .macOS(.v14)],   // tvOS 17 for symbolEffect, macOS 14 for build compatibility
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
