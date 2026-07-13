const mongoose = require('mongoose');

/**
 * Company Question Bank (blueprint 3B.18).
 * Phase-2-honest scope note: true "crowdsourcing" implies a submission +
 * moderation pipeline we don't have yet. This model supports user
 * submissions (source: 'user_submitted') alongside curated seed data
 * (source: 'seed'), but there's no moderation/upvote/report flow — treat
 * user submissions as unverified until that's built.
 */
const CompanyQuestionSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, index: true },
    questionText: { type: String, required: true },
    tags: { type: [String], default: [] }, // e.g. ['system_design', 'behavioral']
    recency: { type: Date, default: Date.now }, // when this question was reported/added
    source: { type: String, enum: ['seed', 'user_submitted'], default: 'user_submitted' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanyQuestion', CompanyQuestionSchema);
