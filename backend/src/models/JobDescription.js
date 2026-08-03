const mongoose = require('mongoose');

const JobDescriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rawText: { type: String, required: true },
    sourceUrl: { type: String, default: null },
    jobTitle: { type: String, default: '' },
    company: { type: String, default: '' },
    requiredSkills: { type: [String], default: [] },
    niceToHave: { type: [String], default: [] },
    softSkills: { type: [String], default: [] },
    experienceLevel: { type: String, default: '' },
    responsibilities: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobDescription', JobDescriptionSchema);
