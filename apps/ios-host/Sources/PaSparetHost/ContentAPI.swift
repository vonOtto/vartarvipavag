import Foundation

/// REST client for content pack management.
enum ContentAPI {

    /// Origin used for REST calls.
    private static let baseURL = ProcessInfo.processInfo.environment["BASE_URL"]
                                  ?? "http://localhost:3000"

    // MARK: – Content Pack Endpoints ─────────────────────────────────────────────

    /// GET /v1/content/packs → List all available content packs.
    static func listContentPacks() async throws -> [ContentPackInfo] {
        guard let url = URL(string: "\(baseURL)/v1/content/packs") else {
            throw APIError.invalidURL
        }

        let req = URLRequest(url: url)
        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        let wrapper = try JSONDecoder().decode(ContentPacksResponse.self, from: data)
        return wrapper.packs
    }

    /// GET /v1/content/packs/:id → Get full content pack details.
    static func getContentPack(id: String) async throws -> ContentPack {
        guard let url = URL(string: "\(baseURL)/v1/content/packs/\(id)") else {
            throw APIError.invalidURL
        }

        let req = URLRequest(url: url)
        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(ContentPack.self, from: data)
    }

    /// DELETE /v1/content/packs/:id → Delete a content pack.
    static func deleteContentPack(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/v1/content/packs/\(id)") else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"

        let (_, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 204 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
    }

    // MARK: – Generation Endpoints ───────────────────────────────────────────────

    /// POST /v1/content/generate → Start generating a new content pack.
    static func generateContent() async throws -> GenerateResponse {
        guard let url = URL(string: "\(baseURL)/v1/content/generate") else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Empty body for now
        req.httpBody = try JSONSerialization.data(withJSONObject: [:])

        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 202 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(GenerateResponse.self, from: data)
    }

    /// GET /v1/content/generate/:id/status → Poll generation status.
    static func getGenerationStatus(id: String) async throws -> GenerationStatus {
        guard let url = URL(string: "\(baseURL)/v1/content/generate/\(id)/status") else {
            throw APIError.invalidURL
        }

        let req = URLRequest(url: url)
        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(GenerationStatus.self, from: data)
    }

    /// POST /v1/content/packs/import → Import a content pack from JSON.
    static func importContentPack(json: Data) async throws -> String {
        guard let url = URL(string: "\(baseURL)/v1/content/packs/import") else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = json

        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse, http.statusCode == 201 else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        let result = try JSONDecoder().decode(ImportResponse.self, from: data)
        return result.roundId
    }
}

// MARK: – Response Wrappers ────────────────────────────────────────────────────

struct ContentPacksResponse: Decodable {
    let packs: [ContentPackInfo]
}

struct ImportResponse: Decodable {
    let roundId: String
}
