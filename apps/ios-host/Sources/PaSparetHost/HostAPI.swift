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
}

// MARK: – errors ──────────────────────────────────────────────────────────────

enum APIError: LocalizedError {
    case invalidURL
    case http(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL : return "Invalid URL"
        case .http(let c): return "HTTP \(c)"
        }
    }
}
