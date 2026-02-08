import Foundation

// MARK: – Content Pack Models ──────────────────────────────────────────────────

/// Metadata about a content pack available in the library.
struct ContentPackInfo: Codable, Identifiable {
    let roundId: String
    let destinationName: String
    let destinationCountry: String
    let generatedAt: String
    let verified: Bool
    let antiLeakChecked: Bool

    var id: String { roundId }
}

/// Full content pack details for preview.
struct ContentPack: Codable {
    let roundId: String
    let destination: ContentDestination
    let clues: [ContentClue]
    let followupQuestions: [ContentFollowupQuestion]
    let metadata: ContentMetadata
}

struct ContentDestination: Codable {
    let name: String
    let country: String
}

struct ContentClue: Codable {
    let text: String
    let points: Int
}

struct ContentFollowupQuestion: Codable {
    let questionText: String
    let correctAnswer: String
    let options: [String]?  // nil = open-text
    let type: String        // "MULTIPLE_CHOICE" | "OPEN_TEXT"
}

struct ContentMetadata: Codable {
    let generatedAt: String
    let verified: Bool
    let antiLeakChecked: Bool
}

// MARK: – Generation Models ────────────────────────────────────────────────────

/// Response from POST /v1/content/generate.
struct GenerateResponse: Codable {
    let generateId: String
    let status: String      // "generating"
}

/// Status response from GET /v1/content/generate/:id/status.
struct GenerationStatus: Codable {
    let generateId: String
    let status: String      // "generating" | "completed" | "failed"
    let currentStep: Int
    let totalSteps: Int
    let currentStepDescription: String?
    let contentPackId: String?
    let error: String?

    var progress: Double {
        guard totalSteps > 0 else { return 0.0 }
        return Double(currentStep) / Double(totalSteps)
    }
}
