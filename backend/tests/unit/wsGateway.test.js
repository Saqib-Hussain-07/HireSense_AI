jest.mock('../../src/models/InterviewSession');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/services/scoringEngine');
jest.mock('../../src/services/distributedLock');

const http = require('http');
const WebSocket = require('ws');
const InterviewSession = require('../../src/models/InterviewSession');
const { resolveUserFromToken } = require('../../src/middleware/auth');
const { scoreAnswer } = require('../../src/services/scoringEngine');
const { acquireLock, releaseLock } = require('../../src/services/distributedLock');
const attachWsGateway = require('../../src/services/wsGateway');

describe('wsGateway WebSocket Targeted Positional Updates', () => {
  let server;
  let port;
  let wsUrl;
  const sessionId = '507f1f77bcf86cd799439011';
  const userId = 'user_test_123';

  beforeAll((done) => {
    server = http.createServer();
    attachWsGateway(server);
    server.listen(0, () => {
      port = server.address().port;
      wsUrl = `ws://127.0.0.1:${port}/ws/interview/${sessionId}?token=valid_token`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resolveUserFromToken.mockResolvedValue(userId);
    acquireLock.mockResolvedValue({ acquired: true, lockId: 'lock_abc' });
    releaseLock.mockResolvedValue(true);
  });

  test('transcript_final executes targeted positional updateOne instead of full-document save', (done) => {
    const mockSession = {
      _id: sessionId,
      userId,
      currentQuestionIndex: 0,
      mode: 'coaching',
      persona: 'friendly_mentor',
      type: 'technical',
      questions: [
        {
          questionText: 'Tell me about React hooks.',
          scoringStatus: 'unanswered',
          answerTranscript: '',
          rubricScores: {},
          finalScore: 0,
        },
      ],
      save: jest.fn(),
    };

    InterviewSession.findOne = jest.fn().mockResolvedValue(mockSession);
    InterviewSession.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    scoreAnswer.mockResolvedValue({
      rubricScores: { relevance: 8, technicalAccuracy: 8, deliveryScore: 8 },
      finalScore: 8,
      idealAnswer: 'React hooks are functions...',
      gapNotes: 'Good coverage.',
      evidenceQuotes: [],
      sentiment: 'positive',
      engagement: 90,
      confidenceScore: 85,
      jargonHighlights: [],
      pushback: null,
      followUp: 'How does useEffect clean up?',
    });

    const client = new WebSocket(wsUrl);

    client.on('open', () => {
      // Send transcript_final
      client.send(
        JSON.stringify({
          type: 'transcript_final',
          questionIndex: 0,
          text: 'Hooks allow functional components to have state.',
          durationSeconds: 15,
        })
      );
    });

    client.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'scored') {
        // 1. Verify session.save() was never called
        expect(mockSession.save).not.toHaveBeenCalled();

        // 2. Verify InterviewSession.updateOne was called with targeted positional updates
        expect(InterviewSession.updateOne).toHaveBeenCalledWith(
          { _id: sessionId },
          expect.objectContaining({
            $set: expect.objectContaining({
              'questions.0.answerTranscript': 'Hooks allow functional components to have state.',
              'questions.0.scoringStatus': 'scoring',
            }),
          })
        );

        expect(InterviewSession.updateOne).toHaveBeenCalledWith(
          { _id: sessionId },
          expect.objectContaining({
            $set: expect.objectContaining({
              'questions.0.scoringStatus': 'scored',
              'questions.0.finalScore': 8,
              'questions.0.idealAnswer': 'React hooks are functions...',
              'questions.0.followUps': [{ q: 'How does useEffect clean up?', aTranscript: '' }],
            }),
          })
        );

        client.close();
        done();
      }
    });
  });

  test('advance executes targeted updateOne for currentQuestionIndex', (done) => {
    const mockSession = {
      _id: sessionId,
      userId,
      currentQuestionIndex: 0,
      persona: 'friendly_mentor',
      questions: [
        { questionText: 'Q1', scoringStatus: 'scored' },
        { questionText: 'Q2', scoringStatus: 'unanswered' },
      ],
      save: jest.fn(),
    };

    InterviewSession.findOne = jest.fn().mockResolvedValue(mockSession);
    InterviewSession.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    const client = new WebSocket(wsUrl);

    client.on('open', () => {
      client.send(
        JSON.stringify({
          type: 'advance',
          questionIndex: 0,
        })
      );
    });

    client.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'question' && msg.questionIndex === 1) {
        expect(mockSession.save).not.toHaveBeenCalled();
        expect(InterviewSession.updateOne).toHaveBeenCalledWith(
          { _id: sessionId },
          expect.objectContaining({
            $set: expect.objectContaining({
              currentQuestionIndex: 1,
            }),
          })
        );
        client.close();
        done();
      }
    });
  });
});
