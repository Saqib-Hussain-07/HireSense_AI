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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
    jdId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobDescription', required: true },
    matchPercent: { type: Number, default: 0 },
    missing: { type: [String], default: [] },
    strong: { type: [String], default: [] },
    skillGaps: { type: [SkillGapSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MatchReport', MatchReportSchema);
