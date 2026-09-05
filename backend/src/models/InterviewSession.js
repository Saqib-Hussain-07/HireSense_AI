const mongoose = require('mongoose');

const FollowUpSchema = new mongoose.Schema(
  { q: String, aTranscript: String },
  { _id: false }
);

const EvidenceQuoteSchema = new mongoose.Schema(
  { criterion: String, quote: String },
  { _id: false }
);

const RubricScoresSchema = new mongoose.Schema(
  {
    relevance: { type: Number, default: 0 },
    structure: { type: Number, default: 0 },
    technicalAccuracy: { type: Number, default: 0 },
    businessThinking: { type: Number, default: 0 },
    deliveryScore: { type: Number, default: 0 },
    star: { type: Number, default: 0 },
    creativity: { type: Number, default: 0 },
  },
  { _id: false }
);

const StarCheckSchema = new mongoose.Schema(
  {
    situation: { type: Boolean, default: false },
    task: { type: Boolean, default: false },
    action: { type: Boolean, default: false },
    result: { type: Boolean, default: false },
  },
  { _id: false }
);

const JargonHighlightSchema = new mongoose.Schema(
  { wordOrPhrase: String, replacement: String, reason: String },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    questionText: String,
    questionAudioUrl: String,
    // Which persona owns this specific question. Populated for Panel Mode
    // (round-robin assigned across panelPersonas at generation time); for a
    // normal single-persona session this stays null and callers fall back
    // to session.persona.
    persona: { type: String, default: null },
    answerTranscript: { type: String, default: '' },
    answerAudioUrl: String,
    followUps: { type: [FollowUpSchema], default: [] },
    rubricScores: { type: RubricScoresSchema, default: () => ({}) },
    finalScore: { type: Number, default: 0 },
    verdict: { type: String, enum: ['Hire', 'Hold', 'Pass'], default: null },
    evidenceQuotes: { type: [EvidenceQuoteSchema], default: [] },
    starCheck: { type: StarCheckSchema, default: () => ({}) },
    idealAnswer: { type: String, default: '' },
    gapNotes: { type: String, default: '' },
    pushback: { type: String, default: null },
    timedOut: { type: Boolean, default: false },
    // turn-level state used for silence timeout handling (45s nudge / 90s auto-advance)
    silenceNudgedAt: { type: Date, default: null },
    // turn-level distributed scoring status (unanswered -> scoring -> scored / failed)
    scoringStatus: {
      type: String,
      enum: ['unanswered', 'scoring', 'scored', 'failed'],
      default: 'unanswered',
    },
    scoringStartedAt: { type: Date, default: null },
    sentiment: { type: String, default: 'neutral' },
    engagement: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    jargonHighlights: { type: [JargonHighlightSchema], default: [] },
  },
  { _id: false }
);

const InterviewSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    matchReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'MatchReport' },
    type: {
      type: String,
      enum: ['technical', 'hr', 'dsa', 'system_design', 'behavioral'],
      default: 'technical',
    },
    persona: { type: String, default: 'friendly_mentor' },
    // Panel Interview Mode (blueprint Phase 3): when set, this session
    // alternates between two personas — see questions[].persona for which
    // one owns each individual question. `persona` above stays populated
    // with panelPersonas[0] for backward compatibility with single-persona
    // code paths that haven't been updated to check panelPersonas.
    panelPersonas: { type: [String], default: undefined },
    mode: { type: String, enum: ['coaching', 'neutral_assessment'], default: 'coaching' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    currentQuestionIndex: { type: Number, default: 0 },
    lastSavedAt: { type: Date, default: Date.now },
    questions: { type: [QuestionSchema], default: [] },
    overallScore: { type: Number, default: 0 },
    verdict: { type: String, enum: ['Hire', 'Hold', 'Pass'], default: null },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Performance Indexes for fast dashboard, history, and weakness tracking queries
InterviewSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
InterviewSessionSchema.index({ userId: 1, createdAt: -1 });

// Every write to a session should refresh lastSavedAt so /resume can show
// "last saved X seconds ago" and reload logic has a reliable checkpoint.
InterviewSessionSchema.pre('save', function (next) {
  this.lastSavedAt = new Date();
  next();
});

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
