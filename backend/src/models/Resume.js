const mongoose = require('mongoose');

const WeakBulletSchema = new mongoose.Schema(
  { original: String, suggested: String },
  { _id: false }
);

const ResumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, default: 1 },

    // ── File stored directly in MongoDB (Buffer) ──────────────────────────────
    // Replaces the old fileUrl / local-disk / Cloudinary approach.
    // MongoDB document limit is 16 MB — resumes are always well under that.
    fileData:  { type: Buffer,  default: null },   // raw binary of the uploaded PDF/DOCX
    fileName:  { type: String,  default: '' },     // original filename e.g. "john_cv.pdf"
    mimeType:  { type: String,  default: 'application/pdf' },

    rawText: { type: String, default: '' },
    parsed: {
      skills:         { type: [String],                          default: [] },
      education:      { type: [mongoose.Schema.Types.Mixed],     default: [] },
      experience:     { type: [mongoose.Schema.Types.Mixed],     default: [] },
      projects:       { type: [mongoose.Schema.Types.Mixed],     default: [] },
      certifications: { type: [String],                          default: [] },
    },
    atsScore:        { type: Number,   default: 0 },
    missingKeywords: { type: [String], default: [] },
    weakBullets:     { type: [WeakBulletSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', ResumeSchema);
