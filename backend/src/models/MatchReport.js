const mongoose = require('mongoose');

const SkillGapSchema = new mongoose.Schema(
  {
    skill: String,
    why: String,
    resources: { type: [String], default: [] },
    estHours: Number,
  },
  { _id: false }
);

const MatchReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
    jdId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobDescription', required: true, index: true },
    matchPercent: { type: Number, default: 0 },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    missing: { type: [String], default: [] },
    strong: { type: [String], default: [] },
    skillGaps: { type: [SkillGapSchema], default: [] },
  },
  { timestamps: true }
);

MatchReportSchema.index({ userId: 1, createdAt: -1 });
MatchReportSchema.index({ userId: 1, jdId: 1 });
MatchReportSchema.index({ userId: 1, resumeId: 1, jdId: 1 });

module.exports = mongoose.model('MatchReport', MatchReportSchema);

