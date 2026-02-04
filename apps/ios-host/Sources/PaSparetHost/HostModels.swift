import Foundation

// MARK: – REST response types ─────────────────────────────────────────────────

/// POST /v1/sessions → 201
struct CreateSessionResponse: Decodable {
    let sessionId       : String
    let joinCode        : String
    let hostAuthToken   : String
    let wsUrl           : String
    let joinUrlTemplate : String   // e.g. "http://host:3000/join/{joinCode}"
}

// MARK: – Game models ─────────────────────────────────────────────────────────

struct Player: Decodable, Identifiable {
    let playerId   : String
    let name       : String
    let isConnected: Bool

    var id: String { playerId }

    init(playerId: String, name: String, isConnected: Bool) {
        self.playerId    = playerId
        self.name        = name
        self.isConnected = isConnected
    }

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

struct LockedAnswer: Decodable, Identifiable {
    let playerId            : String
    let answerText          : String          // HOST sees this (full projection)
    let lockedAtLevelPoints : Int
    let lockedAtMs          : Int

    var id: String { playerId }
}

struct ScoreboardEntry: Decodable, Identifiable {
    let playerId   : String
    let name       : String
    let totalScore : Int

    var id: String { playerId }

    init(playerId: String, name: String, totalScore: Int) {
        self.playerId   = playerId
        self.name       = name
        self.totalScore = totalScore
    }

    init(from decoder: Decoder) throws {
        let c           = try decoder.container(keyedBy: CodingKeys.self)
        self.playerId   = try c.decode(String.self, forKey: .playerId)
        self.name       = try c.decode(String.self, forKey: .name)
        self.totalScore = try c.decode(Int.self,    forKey: .score)
    }

    private enum CodingKeys: String, CodingKey {
        case playerId, name
        case score   // backend key
    }
}

struct PlayerResult: Decodable, Identifiable {
    let playerId            : String
    let playerName          : String
    let answerText          : String
    let isCorrect           : Bool
    let pointsAwarded       : Int
    let lockedAtLevelPoints : Int

    var id: String { playerId }
}

// MARK: – Followup models (HOST projection) ─────────────────────────────────

/// One entry inside answersByPlayer — HOST-only.
struct HostFollowupAnswerByPlayer: Identifiable {
    let playerId   : String
    let playerName : String
    let answerText : String

    var id: String { playerId }
}

/// Active followup-question state as seen by HOST.
/// HOST receives correctAnswer immediately; answersByPlayer populates on
/// FOLLOWUP_ANSWERS_LOCKED.
struct HostFollowupQuestion {
    let questionText         : String
    let options              : [String]?          // nil = open-text
    let currentQuestionIndex : Int
    let totalQuestions       : Int
    let correctAnswer        : String            // HOST-only secret
    var  answersByPlayer     : [HostFollowupAnswerByPlayer] = []
    let timerStartMs         : Int?
    let timerDurationMs      : Int?
}

/// One row inside FOLLOWUP_RESULTS.
struct HostFollowupResultRow: Identifiable {
    let playerId      : String
    let playerName    : String
    let isCorrect     : Bool
    let pointsAwarded : Int

    var id: String { playerId }
}

// MARK: – Full STATE_SNAPSHOT payload (HOST projection) ───────────────────────

struct HostGameState: Decodable {
    let phase              : String
    let players            : [Player]
    let clueText           : String?
    let levelPoints        : Int?
    let scoreboard         : [ScoreboardEntry]
    let joinCode           : String?
    let lockedAnswers      : [LockedAnswer]
    let destinationName    : String?     // HOST sees this even before reveal
    let destinationCountry : String?
    let brakeOwnerPlayerId : String?
    let followupQuestion   : HostFollowupQuestion?

    init(from decoder: Decoder) throws {
        let c                  = try  decoder.container(keyedBy: CodingKeys.self)
        self.phase             = try  c.decode(String.self,                forKey: .phase)
        self.players           = (try? c.decode([Player].self,             forKey: .players))        ?? []
        self.clueText          = try? c.decode(String.self,                forKey: .clueText)
        self.levelPoints       = try? c.decode(Int.self,                   forKey: .levelPoints)
        self.scoreboard        = (try? c.decode([ScoreboardEntry].self,    forKey: .scoreboard))     ?? []
        self.joinCode          = try? c.decode(String.self,                forKey: .joinCode)
        self.lockedAnswers     = (try? c.decode([LockedAnswer].self,       forKey: .lockedAnswers))  ?? []
        self.brakeOwnerPlayerId = try? c.decode(String.self,               forKey: .brakeOwnerPlayerId)
        // destination is a nested object
        if let dest = try? c.decode(Destination.self, forKey: .destination) {
            self.destinationName   = dest.name
            self.destinationCountry = dest.country
        } else {
            self.destinationName   = nil
            self.destinationCountry = nil
        }
        // followupQuestion is a nested object; decode via helper then lift fields
        if let fqDict = try? c.decode(RawFollowup.self, forKey: .followupQuestion) {
            self.followupQuestion = HostFollowupQuestion(
                questionText:         fqDict.questionText,
                options:              fqDict.options,
                currentQuestionIndex: fqDict.currentQuestionIndex,
                totalQuestions:       fqDict.totalQuestions,
                correctAnswer:        fqDict.correctAnswer ?? "",
                answersByPlayer:      fqDict.answersByPlayer.map {
                    HostFollowupAnswerByPlayer(playerId: $0.playerId,
                                               playerName: $0.playerName,
                                               answerText: $0.answerText)
                },
                timerStartMs:         fqDict.timer?.startAtServerMs,
                timerDurationMs:      fqDict.timer?.durationMs
            )
        } else {
            self.followupQuestion = nil
        }
    }

    private enum CodingKeys: String, CodingKey {
        case phase, players, clueText, scoreboard, joinCode
        case levelPoints = "clueLevelPoints"
        case lockedAnswers, destination, brakeOwnerPlayerId, followupQuestion
    }

    /// Thin Decodable wrapper for the followupQuestion object in STATE_SNAPSHOT.
    private struct RawFollowup: Decodable {
        let questionText         : String
        let options              : [String]?
        let currentQuestionIndex : Int
        let totalQuestions       : Int
        let correctAnswer        : String?   // HOST gets this; others get null
        let answersByPlayer      : [RawAnswer]
        let timer                : TimerObj?

        struct RawAnswer: Decodable {
            let playerId   : String
            let playerName : String
            let answerText : String
        }
        struct TimerObj: Decodable {
            let startAtServerMs : Int
            let durationMs      : Int
        }
    }

    private struct Destination: Decodable {
        let name   : String?
        let country: String?
    }
}
