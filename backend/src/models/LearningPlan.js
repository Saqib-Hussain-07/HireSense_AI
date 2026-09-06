const mongoose = require('mongoose');

const DayTaskSchema = new mongoose.Schema({ day: String, task: String }, { _id: false });

const LearningPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    days: { type: [DayTaskSchema], default: [] },
    topicsFingerprint: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningPlan', LearningPlanSchema);
