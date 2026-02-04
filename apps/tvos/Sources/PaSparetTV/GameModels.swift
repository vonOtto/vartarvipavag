import Foundation

// MARK: – Player

struct Player: Decodable, Identifiable {
    let playerId   : String
    let name       : String
    let isConnected: Bool

    var id: String { playerId }

    /// Explicit memberwise init used when constructing from raw JSON dicts (e.g. LOBBY_UPDATED).
    init(playerId: String, name: String, isConnected: Bool) {
        self.playerId    = playerId
        self.name        = name
        self.isConnected = isConnected
    }

    /// Tolerant Decodable: isConnected defaults to true when missing.
    init(from decoder: Decoder) throws {
        let c            = try decoder.container(keyedBy: CodingKeys.self)
        self.playerId    = try  c.decode(String.self, forKey: .playerId)
        self.name        = try  c.decode(String.self, forKey: .name)
        self.isConnected = (try? c.decode(Bool.self,   forKey: .isConnected)) ?? true
    }

    private enum CodingKeys: String, CodingKey {
        case playerId, name, isConnected
    }
}

// MARK: – ScoreboardEntry

struct ScoreboardEntry: Decodable, Identifiable {
    let playerId   : String
    let name       : String
    let totalScore : Int

    var id: String { playerId }
}

// MARK: – GameState

/// Full game-state payload carried inside every STATE_SNAPSHOT.
/// Fields that are absent in certain phases (e.g. clueText in LOBBY)
/// are decoded as optionals so the struct never fails to init.
struct GameState: Decodable {
    let phase              : String                  // raw backend string, e.g. "CLUE_LEVEL"
    let players            : [Player]
    let clueText           : String?
    let levelPoints        : Int?                    // backend key: clueLevelPoints
    let scoreboard         : [ScoreboardEntry]
    let joinCode           : String?
    let lockedAnswersCount : Int                     // TV projection: top-level count
    let brakeOwnerName     : String?                 // populated when phase == PAUSED_FOR_BRAKE

    init(from decoder: Decoder) throws {
        let c                  = try  decoder.container(keyedBy: CodingKeys.self)
        self.phase             = try  c.decode(String.self,              forKey: .phase)
        self.players           = (try? c.decode([Player].self,           forKey: .players))   ?? []
        self.clueText          = try? c.decode(String.self,              forKey: .clueText)
        self.levelPoints       = try? c.decode(Int.self,                 forKey: .levelPoints)
        self.scoreboard        = (try? c.decode([ScoreboardEntry].self,  forKey: .scoreboard)) ?? []
        self.joinCode          = try? c.decode(String.self,              forKey: .joinCode)
        // TV projection sends lockedAnswersCount directly; fall back to lockedAnswers array length
        if let count = try? c.decode(Int.self, forKey: .lockedAnswersCount) {
            self.lockedAnswersCount = count
        } else if c.contains(.lockedAnswers) {
            self.lockedAnswersCount = try c.decode([LockedAnswerStub].self, forKey: .lockedAnswers).count
        } else {
            self.lockedAnswersCount = 0
        }
        self.brakeOwnerName    = try? c.decode(String.self, forKey: .brakeOwnerName)
    }

    private enum CodingKeys: String, CodingKey {
        case phase, players, clueText, scoreboard, joinCode
        case levelPoints = "clueLevelPoints"   // match backend key
        case lockedAnswersCount, lockedAnswers, brakeOwnerName
    }
}

/// Minimal stub used only to count elements in the lockedAnswers array
/// when the TV projection omits lockedAnswersCount.
private struct LockedAnswerStub: Decodable {
    init(from decoder: Decoder) throws {
        // Consume the keyed container so the decoder advances; we only need the count.
        _ = try decoder.container(keyedBy: CodingKeys.self)
    }
    private enum CodingKeys: String, CodingKey {
        case playerId   // every lockedAnswer has at least this
    }
}
