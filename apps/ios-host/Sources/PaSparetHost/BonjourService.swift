import Foundation

/// Bonjour/mDNS service broadcaster for making sessions discoverable on the local network.
/// Broadcasts session metadata as a _tripto._tcp service with TXT record containing
/// sessionId, joinCode, and destinationCount.
class BonjourService: NSObject, NetServiceDelegate {

    // MARK: - Properties

    private var netService: NetService?
    private var isPublishing = false

    /// Callback invoked when publishing state changes
    var onPublishingStateChanged: ((Bool) -> Void)?

    // MARK: - Public API

    /// Start broadcasting the session on the local network.
    ///
    /// - Parameters:
    ///   - sessionId: The unique session identifier
    ///   - joinCode: The 6-character join code (used as service name)
    ///   - destinationCount: Number of destinations in the game plan
    func startBroadcasting(sessionId: String, joinCode: String, destinationCount: Int) {
        print("[Bonjour] startBroadcasting called with sessionId: \(sessionId), joinCode: \(joinCode), destinations: \(destinationCount)")

        // Stop any existing service first
        stopBroadcasting()

        // Create service with join code as name
        // Port 0 means we're not actually listening on a port (service is just for discovery)
        let service = NetService(domain: "local.", type: "_tripto._tcp.", name: joinCode, port: 0)

        // Build TXT record with session metadata
        var txtDict: [String: Data] = [:]
        if let sessionData = sessionId.data(using: .utf8) {
            txtDict["sessionId"] = sessionData
        }
        if let joinCodeData = joinCode.data(using: .utf8) {
            txtDict["joinCode"] = joinCodeData
        }
        if let destCountData = String(destinationCount).data(using: .utf8) {
            txtDict["destinations"] = destCountData
        }

        print("[Bonjour] TXT record keys: \(txtDict.keys)")

        let txtData = NetService.data(fromTXTRecord: txtDict)
        service.setTXTRecord(txtData)

        // Set delegate and publish
        service.delegate = self
        service.publish()

        self.netService = service
        // Don't set isPublishing = true yet; wait for delegate callback

        print("[Bonjour] NetService.publish() called, waiting for delegate callback...")
    }

    /// Stop broadcasting the session.
    func stopBroadcasting() {
        guard let service = netService else { return }

        service.stop()
        service.delegate = nil
        self.netService = nil
        self.isPublishing = false

        print("[Bonjour] Stopped broadcasting")
    }

    /// Check if currently broadcasting.
    var isBroadcasting: Bool {
        return isPublishing && netService != nil
    }

    // MARK: - NetServiceDelegate

    func netServiceDidPublish(_ sender: NetService) {
        print("[Bonjour] ✅ Service published successfully: \(sender.name)")
        isPublishing = true
        onPublishingStateChanged?(true)
    }

    func netService(_ sender: NetService, didNotPublish errorDict: [String : NSNumber]) {
        print("[Bonjour] ❌ Failed to publish service: \(errorDict)")
        isPublishing = false
        onPublishingStateChanged?(false)
    }

    func netServiceDidStop(_ sender: NetService) {
        print("[Bonjour] Service stopped: \(sender.name)")
        isPublishing = false
        onPublishingStateChanged?(false)
    }
}
