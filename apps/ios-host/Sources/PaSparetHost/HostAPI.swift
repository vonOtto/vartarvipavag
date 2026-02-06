import Foundation

/// Thin REST client for the host role.  Only one endpoint is needed:
/// POST /v1/sessions  →  CreateSessionResponse
enum HostAPI {

    /// Origin used for REST calls.  Set BASE_URL env var in Xcode scheme
    /// (Edit Scheme → Run → Environment Variables) to point at a LAN backend.
    private static let baseURL = ProcessInfo.processInfo.environment["BASE_URL"]
                                  ?? "http://localhost:3000"

    /// Create a new session and return host credentials + join info.
    static func createSession() async throws -> CreateSessionResponse {
        guard let url = URL(string: "\(baseURL)/v1/sessions") else {
            throw APIError.invalidURL
        }

        var req       = URLRequest(url: url)
        req.httpMethod = "POST"

        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 201 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(CreateSessionResponse.self, from: data)
    }

    /// Lookup session by join code.
    static func lookupByCode(_ code: String) async throws -> LookupResponse {
        guard let url = URL(string: "\(baseURL)/v1/sessions/by-code/\(code)") else {
            throw APIError.invalidURL
        }

        let req = URLRequest(url: url)
        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(LookupResponse.self, from: data)
    }

    /// Join an existing session as HOST.
    static func joinSession(sessionId: String) async throws -> JoinResponse {
        guard let url = URL(string: "\(baseURL)/v1/sessions/\(sessionId)/join") else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "name": "Host",
            "role": "HOST"
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.http(0)
        }

        if http.statusCode == 409 {
            throw APIError.hostRoleTaken
        }

        guard http.statusCode == 200 || http.statusCode == 201 else {
            throw APIError.http(http.statusCode)
        }

        return try JSONDecoder().decode(JoinResponse.self, from: data)
    }
}

// MARK: – errors ──────────────────────────────────────────────────────────────

// MARK: – Response types ─────────────────────────────────────────────────────

/// GET /v1/sessions/by-code/:code → 200
struct LookupResponse: Decodable {
    let sessionId: String
    let joinCode: String
}

/// POST /v1/sessions/:id/join → 200/201
struct JoinResponse: Decodable {
    let playerId: String
    let playerAuthToken: String
    let role: String
    let wsUrl: String
}

// MARK: – Errors ──────────────────────────────────────────────────────────────

enum APIError: LocalizedError {
    case invalidURL
    case http(Int)
    case hostRoleTaken

    var errorDescription: String? {
        switch self {
        case .invalidURL:     return "Invalid URL"
        case .http(let c):    return "HTTP \(c)"
        case .hostRoleTaken:  return "Session already has a host"
        }
    }
}
