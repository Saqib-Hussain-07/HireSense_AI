const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    clerkId: { type: String, sparse: true, unique: true, index: true },
    college: { type: String, default: '' },
    degree: { type: String, default: '' },
    gradYear: { type: Number },
    skills: { type: [String], default: [] },
    experience: { type: String, default: '' },
    targetRole: { type: String, default: '' },
    preferredCompanies: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
