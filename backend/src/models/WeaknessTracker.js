const mongoose = require('mongoose');

const WeakTopicSchema = new mongoose.Schema(
  { topic: String, occurrences: { type: Number, default: 1 }, lastSeen: Date },
  { _id: false }
);

const WeaknessTrackerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    weakTopics: { type: [WeakTopicSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WeaknessTracker', WeaknessTrackerSchema);
