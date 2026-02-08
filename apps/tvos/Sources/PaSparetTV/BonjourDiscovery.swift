import Foundation

/// Represents a discovered session on the local network via Bonjour/mDNS.
struct DiscoveredSession: Identifiable {
    let id: String               // sessionId
    let joinCode: String
    let destinationCount: Int
    let service: NetService
}

// MARK: – BonjourDiscovery

/// Observable object that discovers iOS Host sessions on the local network
/// using Bonjour/mDNS. Publishes an array of discovered sessions that can be
/// displayed in the UI and used for auto-join.
@MainActor
class BonjourDiscovery: NSObject, ObservableObject {
    @Published var discoveredSessions: [DiscoveredSession] = []

    private let browser = NetServiceBrowser()
    private var resolvingServices: [NetService] = []

    override init() {
        super.init()
        browser.delegate = self
    }

    /// Start browsing for _tripto._tcp. services on the local network.
    func startDiscovery() {
        discoveredSessions.removeAll()
        resolvingServices.removeAll()
        browser.searchForServices(ofType: "_tripto._tcp.", inDomain: "local.")
    }

    /// Stop browsing for services and clear discovered sessions.
    func stopDiscovery() {
        browser.stop()
        discoveredSessions.removeAll()
        resolvingServices.removeAll()
    }
}

// MARK: – NetServiceBrowserDelegate

extension BonjourDiscovery: NetServiceBrowserDelegate {

    nonisolated func netServiceBrowserWillSearch(_ browser: NetServiceBrowser) {
        print("[Bonjour] Starting search for _tripto._tcp. services...")
    }

    nonisolated func netServiceBrowser(_ browser: NetServiceBrowser,
                                      didNotSearch errorDict: [String : NSNumber]) {
        print("[Bonjour] Search failed: \(errorDict)")
    }

    nonisolated func netServiceBrowser(_ browser: NetServiceBrowser,
                                      didFind service: NetService,
                                      moreComing: Bool) {
        print("[Bonjour] Found service: \(service.name)")
        service.delegate = self
        Task { @MainActor in
            resolvingServices.append(service)
        }
        service.resolve(withTimeout: 5.0)
    }

    nonisolated func netServiceBrowser(_ browser: NetServiceBrowser,
                                      didRemove service: NetService,
                                      moreComing: Bool) {
        print("[Bonjour] Service removed: \(service.name)")
        Task { @MainActor in
            discoveredSessions.removeAll { $0.service.name == service.name }
        }
    }
}

// MARK: – NetServiceDelegate

extension BonjourDiscovery: NetServiceDelegate {

    nonisolated func netServiceDidResolveAddress(_ sender: NetService) {
        print("[Bonjour] Resolved service: \(sender.name)")

        guard let txtData = sender.txtRecordData() else {
            print("[Bonjour] No TXT record data for \(sender.name)")
            return
        }

        let txtRecord = NetService.dictionary(fromTXTRecord: txtData)

        // Extract sessionId from TXT record
        guard let sessionIdData = txtRecord["sessionId"],
              let sessionId = String(data: sessionIdData, encoding: .utf8) else {
            print("[Bonjour] No sessionId in TXT record for \(sender.name)")
            return
        }

        // Extract destination count (optional, defaults to 0)
        let destCount: Int
        if let destData = txtRecord["destinations"],
           let destString = String(data: destData, encoding: .utf8),
           let count = Int(destString) {
            destCount = count
        } else {
            destCount = 0
        }

        let session = DiscoveredSession(
            id: sessionId,
            joinCode: sender.name,  // service name is the join code
            destinationCount: destCount,
            service: sender
        )

        Task { @MainActor in
            // Avoid duplicates
            if !discoveredSessions.contains(where: { $0.id == session.id }) {
                discoveredSessions.append(session)
                print("[Bonjour] Added session: \(session.joinCode) (\(session.destinationCount) destinations)")
            }
        }
    }

    nonisolated func netService(_ sender: NetService, didNotResolve errorDict: [String : NSNumber]) {
        print("[Bonjour] Failed to resolve \(sender.name): \(errorDict)")
        Task { @MainActor in
            resolvingServices.removeAll { $0.name == sender.name }
        }
    }
}
