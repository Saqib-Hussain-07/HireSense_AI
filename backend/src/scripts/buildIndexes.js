require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const JobDescription = require('../models/JobDescription');
const MatchReport = require('../models/MatchReport');
const Resume = require('../models/Resume');
const WeaknessTracker = require('../models/WeaknessTracker');
const LearningPlan = require('../models/LearningPlan');

const MODELS = [
  { name: 'User', model: User },
  { name: 'InterviewSession', model: InterviewSession },
  { name: 'JobDescription', model: JobDescription },
  { name: 'MatchReport', model: MatchReport },
  { name: 'Resume', model: Resume },
  { name: 'WeaknessTracker', model: WeaknessTracker },
  { name: 'LearningPlan', model: LearningPlan },
];

async function runIndexMigration() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiresense';
  console.log(`[buildIndexes] Connecting to MongoDB at ${uri}...`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[buildIndexes] Connected successfully.\n');

    console.log('── Building & Synchronizing Indexes ───────────────────────────');
    for (const { name, model } of MODELS) {
      try {
        console.log(`[buildIndexes] Syncing indexes for ${name}...`);
        await model.syncIndexes();
        const indexes = await model.collection.listIndexes().toArray();
        console.log(`  ✓ ${name} active indexes (${indexes.length}):`);
        indexes.forEach((idx) => {
          const keyDesc = Object.entries(idx.key)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          const flags = [];
          if (idx.unique) flags.push('unique');
          if (idx.sparse) flags.push('sparse');
          const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
          console.log(`    - ${idx.name} (${keyDesc})${flagStr}`);
        });
      } catch (err) {
        console.error(`  ✗ Error syncing indexes for ${name}:`, err.message);
      }
    }
    console.log('\n[buildIndexes] All indexes synchronized successfully.');
  } catch (err) {
    console.error('[buildIndexes] Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[buildIndexes] Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  runIndexMigration();
}

module.exports = runIndexMigration;
