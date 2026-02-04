import Foundation

/// REST base URL.  Defaults to the local dev server; override via the
/// BASE_URL environment variable (Xcode: Edit Scheme → Run → Environment Variables).
private let BASE_URL = ProcessInfo.processInfo.environment["BASE_URL"]
                       ?? "http://localhost:3000"

enum SessionAPI {

    // MARK: – errors

    enum APIError: LocalizedError {
        case http(Int)

        var errorDescription: String? {
            switch self {
            case .http(let code): return "HTTP error \(code)"
            }
        }
    }

    // MARK: – lookup by join code
    /// GET /v1/sessions/by-code/:joinCode  →  { sessionId, joinCode, phase, playerCount }

    struct LookupResponse: Decodable {
        let sessionId   : String
        let joinCode    : String
        let phase       : String
        let playerCount : Int
    }

    static func lookupByCode(_ code: String) async throws -> LookupResponse {
        let url = URL(string: "\(BASE_URL)/v1/sessions/by-code/\(code)")!
        let (data, resp) = try await URLSession.shared.data(from: url)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.http((resp as? HTTPURLResponse)?.statusCode ?? 0)
        }
        return try JSONDecoder().decode(LookupResponse.self, from: data)
    }

    // MARK: – join as TV
    /// POST /v1/sessions/:id/tv  →  { tvAuthToken, wsUrl }

    struct JoinTVResponse: Decodable {
        let tvAuthToken : String
        let wsUrl       : String
    }

    static func joinAsTV(sessionId: String) async throws -> JoinTVResponse {
        let url = URL(string: "\(BASE_URL)/v1/sessions/\(sessionId)/tv")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody   = "{}".data(using: .utf8)

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.http((resp as? HTTPURLResponse)?.statusCode ?? 0)
        }
        return try JSONDecoder().decode(JoinTVResponse.self, from: data)
    }
}
