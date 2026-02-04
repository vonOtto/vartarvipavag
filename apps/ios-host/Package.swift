// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PaSparetHost",
    platforms: [.iOS(.v16), .macOS(.v12)],   // macOS 12 for overlay(alignment:)
    targets: [
        .executableTarget(
            name: "PaSparetHost",
            path: "Sources/PaSparetHost"
        )
    ]
)
