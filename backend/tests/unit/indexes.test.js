const User = require('../../src/models/User');
const InterviewSession = require('../../src/models/InterviewSession');
const JobDescription = require('../../src/models/JobDescription');
const MatchReport = require('../../src/models/MatchReport');
const Resume = require('../../src/models/Resume');
const WeaknessTracker = require('../../src/models/WeaknessTracker');
const LearningPlan = require('../../src/models/LearningPlan');

describe('Database Model Indexes (Performance Optimization)', () => {
  function getDeclaredIndexes(schema) {
    return schema.indexes().map(([fields, options]) => ({
      fields,
      options: options || {},
    }));
  }

  function hasCompoundIndex(schema, targetFields) {
    const indexes = getDeclaredIndexes(schema);
    return indexes.some(({ fields }) => {
      const fieldKeys = Object.keys(fields);
      const targetKeys = Object.keys(targetFields);
      if (fieldKeys.length !== targetKeys.length) return false;
      return fieldKeys.every((key) => fields[key] === targetFields[key]);
    });
  }

  test('InterviewSession defines userId index and compound query indexes', () => {
    expect(InterviewSession.schema.path('userId').options.index).toBe(true);
    expect(hasCompoundIndex(InterviewSession.schema, { userId: 1, status: 1, createdAt: -1 })).toBe(true);
    expect(hasCompoundIndex(InterviewSession.schema, { userId: 1, createdAt: -1 })).toBe(true);
  });

  test('JobDescription defines userId index and compound query index', () => {
    expect(JobDescription.schema.path('userId').options.index).toBe(true);
    expect(hasCompoundIndex(JobDescription.schema, { userId: 1, createdAt: -1 })).toBe(true);
  });

  test('MatchReport defines userId, resumeId, jdId indexes and compound query indexes', () => {
    expect(MatchReport.schema.path('userId').options.index).toBe(true);
    expect(MatchReport.schema.path('resumeId').options.index).toBe(true);
    expect(MatchReport.schema.path('jdId').options.index).toBe(true);
    expect(hasCompoundIndex(MatchReport.schema, { userId: 1, createdAt: -1 })).toBe(true);
    expect(hasCompoundIndex(MatchReport.schema, { userId: 1, jdId: 1 })).toBe(true);
  });

  test('Resume defines userId index and compound query indexes', () => {
    expect(Resume.schema.path('userId').options.index).toBe(true);
    expect(hasCompoundIndex(Resume.schema, { userId: 1, version: -1 })).toBe(true);
    expect(hasCompoundIndex(Resume.schema, { userId: 1, createdAt: -1 })).toBe(true);
  });

  test('WeaknessTracker defines unique index on userId', () => {
    const opts = WeaknessTracker.schema.path('userId').options;
    expect(opts.unique).toBe(true);
    expect(opts.index).toBe(true);
  });

  test('LearningPlan defines unique index on userId', () => {
    const opts = LearningPlan.schema.path('userId').options;
    expect(opts.unique).toBe(true);
    expect(opts.index).toBe(true);
  });

  test('User defines unique index on email and clerkId', () => {
    expect(User.schema.path('email').options.unique).toBe(true);
    expect(User.schema.path('clerkId').options.unique).toBe(true);
    expect(User.schema.path('clerkId').options.index).toBe(true);
  });
});
