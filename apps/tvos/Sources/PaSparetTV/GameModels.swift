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

    /// Backend sends "score"; map it to totalScore.
    init(playerId: String, name: String, totalScore: Int) {
        self.playerId    = playerId
        self.name        = name
        self.totalScore  = totalScore
    }

    init(from decoder: Decoder) throws {
        let c            = try decoder.container(keyedBy: CodingKeys.self)
        self.playerId    = try c.decode(String.self, forKey: .playerId)
        self.name        = try c.decode(String.self, forKey: .name)
        self.totalScore  = try c.decode(Int.self,    forKey: .score)
    }

    private enum CodingKeys: String, CodingKey {
        case playerId, name
        case score   // backend key → totalScore
    }
}

// MARK: – PlayerResult

/// One row of the DESTINATION_RESULTS payload.
struct PlayerResult: Decodable, Identifiable {
    let playerId            : String
    let playerName          : String
    let answerText          : String
    let isCorrect           : Bool
    let pointsAwarded       : Int
    let lockedAtLevelPoints : Int

    var id: String { playerId }
}

// MARK: – FollowupQuestionInfo

/// What the TV projection sees inside STATE_SNAPSHOT.followupQuestion.
/// correctAnswer and answersByPlayer are stripped by the server for TV.
struct FollowupQuestionInfo: Decodable {
    let questionText         : String
    let options              : [String]?          // nil = open-text
    let currentQuestionIndex : Int
    let totalQuestions       : Int
    let timerStartMs         : Int?               // from nested timer.startAtServerMs
    let timerDurationMs      : Int?               // from nested timer.durationMs

    /// Explicit memberwise init — used when constructing from raw JSON dict in dispatch.
    init(questionText: String, options: [String]?, currentQuestionIndex: Int,
         totalQuestions: Int, timerStartMs: Int?, timerDurationMs: Int?) {
        self.questionText         = questionText
        self.options              = options
        self.currentQuestionIndex = currentQuestionIndex
        self.totalQuestions       = totalQuestions
        self.timerStartMs         = timerStartMs
        self.timerDurationMs      = timerDurationMs
    }

    init(from decoder: Decoder) throws {
        let c                    = try decoder.container(keyedBy: CodingKeys.self)
        self.questionText        = try  c.decode(String.self,   forKey: .questionText)
        self.options             = try? c.decode([String].self, forKey: .options)
        self.currentQuestionIndex = try c.decode(Int.self,      forKey: .currentQuestionIndex)
        self.totalQuestions      = try  c.decode(Int.self,      forKey: .totalQuestions)
        // timer is a nested object { timerId, startAtServerMs, durationMs } or null
        if let timerDict = try? c.decode(TimerWrapper.self, forKey: .timer) {
            self.timerStartMs   = timerDict.startAtServerMs
            self.timerDurationMs = timerDict.durationMs
        } else {
            self.timerStartMs   = nil
            self.timerDurationMs = nil
        }
    }

    private enum CodingKeys: String, CodingKey {
        case questionText, options, currentQuestionIndex, totalQuestions, timer
    }

    private struct TimerWrapper: Decodable {
        let startAtServerMs : Int
        let durationMs      : Int
    }
}

// MARK: – FollowupResultRow

/// One row inside FOLLOWUP_RESULTS.results.  TV sees name + correct/incorrect + points;
/// answersByPlayer free-text is never forwarded to TV.
struct FollowupResultRow: Identifiable {
    let playerId      : String
    let playerName    : String
    let isCorrect     : Bool
    let pointsAwarded : Int

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
    let destinationName    : String?                 // nil until revealed (TV projection)
    let destinationCountry : String?
    let followupQuestion   : FollowupQuestionInfo?   // non-nil when phase == FOLLOWUP_QUESTION
    let clueTimerEnd       : Int?                    // Unix timestamp when clue timer expires
    // Multi-destination tracking
    let destinationIndex         : Int?              // 1-based (1, 2, 3...)
    let totalDestinations        : Int?              // total number of destinations
    let nextDestinationAvailable : Bool?             // true if more destinations exist

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
        // destination is a nested object; both fields are null pre-reveal for TV
        if let dest = try? c.decode(Destination.self, forKey: .destination) {
            self.destinationName   = dest.name
            self.destinationCountry = dest.country
        } else {
            self.destinationName   = nil
            self.destinationCountry = nil
        }
        self.followupQuestion = try? c.decode(FollowupQuestionInfo.self, forKey: .followupQuestion)
        self.clueTimerEnd     = try? c.decode(Int.self, forKey: .clueTimerEnd)
        // Multi-destination tracking
        self.destinationIndex         = try? c.decode(Int.self,  forKey: .destinationIndex)
        self.totalDestinations        = try? c.decode(Int.self,  forKey: .totalDestinations)
        self.nextDestinationAvailable = try? c.decode(Bool.self, forKey: .nextDestinationAvailable)
    }

    private enum CodingKeys: String, CodingKey {
        case phase, players, clueText, scoreboard, joinCode, destination, followupQuestion
        case levelPoints = "clueLevelPoints"   // match backend key
        case lockedAnswersCount, lockedAnswers, brakeOwnerName, clueTimerEnd
        case destinationIndex, totalDestinations, nextDestinationAvailable
    }

    /// Thin wrapper for the nested destination object in STATE_SNAPSHOT.
    private struct Destination: Decodable {
        let name   : String?
        let country: String?
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
