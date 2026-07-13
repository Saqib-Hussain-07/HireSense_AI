const mongoose = require('mongoose');

/**
 * Company-specific interview packs (blueprint Phase 3).
 * Honest scope note: packs are user-creatable with no admin curation or
 * moderation layer — same caveat as the Company Question Bank. A pack is
 * essentially a named preset (company + defaults) that, when used to
 * generate a session, pulls real questions from CompanyQuestion for that
 * company first and tops up with AI-generated ones if the bank is thin.
 */
const InterviewPackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    defaultType: {
      type: String,
      enum: ['technical', 'hr', 'dsa', 'system_design', 'behavioral'],
      default: 'technical',
    },
    defaultDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    defaultPersona: { type: String, default: 'faang_engineer' },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewPack', InterviewPackSchema);
