import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVoice } from '../hooks/useVoice.js';
import { useInterviewSocket } from '../hooks/useInterviewSocket.js';
import { api } from '../lib/api';
import { scoreColor, scoreLabel } from '../lib/formatters';

/* ── Waveform animation (AI speaking) ──────────────────────────────────── */
function AIWaveform({ active }) {
  return (
    <div className="flex items-end gap-[3px] h-8" aria-label="AI speaking">
      {[0.6, 1, 0.75, 1, 0.5, 0.85, 0.65, 1, 0.7, 0.9, 0.55, 0.8].map((h, i) => (
        <span
          key={i}
          className="rounded-full w-[3px] transition-all"
          style={{
            height: active ? `${Math.round(h * 28)}px` : '4px',
            background: active
              ? `rgba(232, 169, 75, ${0.5 + h * 0.5})`
              : 'var(--color-hairline)',
            animation: active ? `wave-bar ${0.8 + (i % 4) * 0.15}s ease-in-out infinite` : 'none',
            animationDelay: active ? `${i * 0.07}s` : '0s',
            transition: 'height 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ── Mic pulse ring (user speaking) ────────────────────────────────────── */
function MicPulse({ active }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings */}
      {active && (
        <>
          <span className="absolute w-20 h-20 rounded-full border border-signal/30 animate-ping-slow" />
          <span className="absolute w-14 h-14 rounded-full border border-signal/50 animate-ping-slower" />
        </>
      )}
      {/* Mic icon circle */}
      <div
        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          active
            ? 'bg-signal shadow-[0_0_20px_rgba(95,184,168,0.4)]'
            : 'bg-panel2 border border-hairline'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={active ? 'var(--color-ink)' : 'var(--color-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8"  y1="23" x2="16" y2="23"/>
        </svg>
      </div>
    </div>
  );
}

/* ── Transcript bubble ──────────────────────────────────────────────────── */
function Bubble({ role, text, isInterim }) {
  const isAI = role === 'ai';
  return (
    <div className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="w-7 h-7 rounded-full bg-onair/20 border border-onair/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-onair text-xs font-bold">AI</span>
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all duration-200 ${
          isAI
            ? 'bg-panel2 text-text rounded-tl-sm border border-hairline'
            : `bg-signal/15 text-text rounded-tr-sm border ${
                isInterim ? 'border-signal/20 opacity-70' : 'border-signal/30'
              }`
        }`}
      >
        {text}
        {isInterim && (
          <span className="inline-flex gap-0.5 ml-1.5 align-middle">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-signal/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        )}
      </div>
      {!isAI && (
        <div className="w-7 h-7 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5FB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      )}
    </div>
  );
}

/* ── Score preview ──────────────────────────────────────────────────────── */
function ScorePreview({ result }) {
  const pct = result.finalScore || 0;
  const color = scoreColor(pct);
  const label = scoreLabel(pct, 'rating');
  return (
    <div className="w-full bg-panel border border-hairline rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">Answer scored</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold" style={{ color }}>{pct}</span>
          <span className="text-xs text-faint font-mono mt-1">/ 10</span>
          <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: color + '22', color }}>{label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {Object.entries(result.rubricScores || {}).map(([k, v]) => (
          <div key={k} className="bg-panel2 rounded-lg px-2.5 py-2">
            <p className="text-faint font-mono uppercase mb-0.5">{k}</p>
            <p className="text-text font-semibold">{v}</p>
          </div>
        ))}
      </div>
      {result.gapNotes && (
        <p className="text-sm text-muted bg-panel2 rounded-lg px-3 py-2">{result.gapNotes}</p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Main Page
──────────────────────────────────────────────────────────────────────── */
export default function VoiceInterviewSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { speak, startListening, stopListening, listening, aiSpeaking, speechSupported } = useVoice();

  const [questionIndex,   setQuestionIndex]   = useState(0);
  const [totalQuestions,  setTotalQuestions]  = useState(null);
  const [lastResult,      setLastResult]      = useState(null);
  const [complete,        setComplete]        = useState(false);
  const [nudge,           setNudge]           = useState(false);
  const [permError,       setPermError]       = useState(false);

  // Transcript log — array of { role: 'ai'|'user', text, isInterim }
  const [transcript, setTranscript] = useState([]);
  // Live interim text from mic
  const [interimText, setInterimText] = useState('');
  
  // Text fallback and onboarding instructions states
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const answerStartRef   = useRef(null);
  const transcriptEndRef  = useRef(null);
  const latestAnswerRef   = useRef(''); // accumulates the full spoken answer text

  // Set initial start time when component mounts
  useEffect(() => {
    answerStartRef.current = Date.now();
  }, []);

  /* ── Helpers to append/update transcript ── */
  function pushAI(text) {
    setTranscript(prev => [...prev, { role: 'ai', text, id: Date.now() }]);
  }

  function pushUserFinal(text) {
    // Replace any existing interim bubble with the final one
    setTranscript(prev => {
      const withoutInterim = prev.filter(m => !m.isInterim);
      return [...withoutInterim, { role: 'user', text, id: Date.now() }];
    });
    setInterimText('');
  }

  /* ── Auto-scroll transcript ── */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  /* ── Socket ── */
  const { send, connected } = useInterviewSocket(id, {
    question: (msg) => {
      setQuestionIndex(msg.questionIndex);
      setLastResult(null);
      setNudge(false);
      pushAI(msg.text);
      speak(msg.text);
      answerStartRef.current = Date.now();
    },
    scored: (msg) => setLastResult(msg.result),
    followup: (msg) => {
      pushAI(msg.text);
      speak(msg.text);
      answerStartRef.current = Date.now();
    },
    pushback: (msg) => {
      pushAI(`⚡ ${msg.text}`);
      speak(msg.text);
      answerStartRef.current = Date.now();
    },
    silence_nudge: () => {
      const nudgeText = "Take your time — I'm still here whenever you're ready.";
      setNudge(true);
      pushAI(nudgeText);
      speak(nudgeText);
    },
    scoring_in_progress: () => {
      setLastResult(null);
    },
    auto_advance: () => setNudge(false),
    session_complete: () => setComplete(true),
    error: (msg) => console.error('[interview ws error]', msg.message),
  });

  /* ── Load session meta ── */
  useEffect(() => {
    api.getInterview(id).then((session) => {
      if (session.status === 'completed') {
        navigate(`/interview/${id}/report`, { replace: true });
        return;
      }
      setTotalQuestions(session.questions.length);
      setQuestionIndex(session.currentQuestionIndex);
    });
  }, [id, navigate]);

  /* ── Mic control ── */
  async function handleStartAnswer() {
    // Request mic permission explicitly so we can surface the error
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPermError(true);
      return;
    }
    setPermError(false);
    answerStartRef.current = Date.now();
    latestAnswerRef.current = '';   // reset for this answer turn
    setLastResult(null);
    setInterimText('');

    startListening(
      // partial — live interim preview (replaces the single interim bubble)
      (partial) => {
        setInterimText(partial);
        send({ type: 'transcript_partial', questionIndex, text: partial });
      },
      // final segment — Chrome fires this per speech pause, NOT just at the end.
      // Keep updating interimText so there's always ONE replaceable bubble.
      // Never call pushUserFinal here — that creates a new permanent bubble each time.
      (finalText) => {
        latestAnswerRef.current = finalText; // accumulate the full running answer
        setInterimText(finalText);           // show as interim (still replaceable)
      },
    );
  }

  function handleDoneAnswering() {
    // Capture the answer BEFORE stopListening clears state.
    // Priority: accumulated finalBuffer > last interim > last user bubble.
    const finalText =
      latestAnswerRef.current ||
      interimText ||
      [...transcript].reverse().find((m) => m.role === 'user')?.text ||
      '';

    stopListening();
    if (finalText) pushUserFinal(finalText);

    const durationSeconds = answerStartRef.current
      ? (Date.now() - answerStartRef.current) / 1000
      : undefined;

    send({ type: 'transcript_final', questionIndex, text: finalText, durationSeconds });
  }

  function handleTextSubmit() {
    if (!typedAnswer.trim()) return;
    const textToSend = typedAnswer.trim();
    setTypedAnswer('');

    pushUserFinal(textToSend);

    // BUG-17: reset the mic buffer so old text doesn't bleed into the next voice answer
    latestAnswerRef.current = '';

    if (listening) {
      stopListening();
    }

    const durationSeconds = answerStartRef.current
      ? (Date.now() - answerStartRef.current) / 1000
      : 15;

    send({ type: 'transcript_final', questionIndex, text: textToSend, durationSeconds });
  }

  function handleRedo() {
    setLastResult(null);
    setInterimText('');
    handleStartAnswer();
  }

  function handleNext() {
    send({ type: 'advance', questionIndex });
  }

  async function handleFinish() {
    // Guard against double-call: the session_complete event + the button both invoke this.
    // If the session was already marked completed by a prior call, just navigate.
    try {
      await api.finishInterview(id);
    } catch (err) {
      // 409 / already finished is fine — navigate anyway
      if (!err.message?.includes('already')) {
        console.error('[handleFinish] error:', err.message);
      }
    }
    navigate(`/interview/${id}/report`);
  }

  function handleEndInterviewPrompt() {
    setShowEndConfirm(true);
  }

  /* ── Complete screen ── */
  if (complete) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-5 bg-ink">
        <div className="w-16 h-16 rounded-full bg-signal/20 border border-signal/40 flex items-center justify-center mb-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5FB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-2xl font-display font-semibold text-text">Session complete</p>
        <p className="text-muted text-sm text-center max-w-sm">
          Your report is ready with scores, evidence quotes, and improved answers.
        </p>
        <button
          onClick={handleFinish}
          className="bg-onair text-ink font-semibold rounded-xl px-6 py-3 text-sm hover:bg-onair2 transition-colors mt-2"
        >
          View session report →
        </button>
      </div>
    );
  }

  // BUG-19: findLast is ES2023 and not supported in Safari < 16; use a compat version
  const currentAIText = [...transcript].reverse().find(m => m.role === 'ai')?.text || '';

  return (
    <div className="h-screen flex flex-col bg-ink overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 px-6 py-3 border-b border-hairline flex items-center justify-between bg-panel">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-signal' : 'bg-alert'}`} />
          <span className="text-xs font-mono text-faint">{connected ? 'live' : 'reconnecting…'}</span>
          <button
            onClick={handleEndInterviewPrompt}
            className="ml-4 text-[10px] uppercase font-mono tracking-wider text-alert hover:text-white border border-alert/30 hover:bg-alert/15 px-2.5 py-1 rounded transition-colors"
          >
            End Interview
          </button>
        </div>

        {/* Progress — only rendered once the real question count is known */}
        <div className="flex items-center gap-3">
          {totalQuestions && (
            <div className="flex gap-1.5">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background: i < questionIndex
                      ? '#5FB8A8'
                      : i === questionIndex
                      ? '#E8A94B'
                      : 'var(--color-hairline)',
                  }}
                />
              ))}
            </div>
          )}
          <span className="text-xs font-mono text-faint">
            {questionIndex + 1}{totalQuestions ? ` / ${totalQuestions}` : ''}
          </span>
        </div>
      </div>

      {/* ── Body: two-column layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: AI visual + controls ── */}
        <div className="w-80 shrink-0 border-r border-hairline flex flex-col items-center justify-between p-6 bg-panel">

          {/* AI avatar + waveform */}
          <div className="flex flex-col items-center gap-4 mt-6">
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
              aiSpeaking
                ? 'bg-onair/20 border-2 border-onair shadow-[0_0_30px_rgba(232,169,75,0.3)]'
                : 'bg-panel2 border-2 border-hairline'
            }`}>
              {/* AI logo */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={aiSpeaking ? '#E8A94B' : 'var(--color-faint)'} strokeWidth="1.5"/>
                <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"
                  stroke={aiSpeaking ? '#E8A94B' : 'var(--color-faint)'} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="2" fill={aiSpeaking ? '#E8A94B' : 'var(--color-faint)'}/>
              </svg>
              {/* Pulse ring when speaking */}
              {aiSpeaking && (
                <span className="absolute inset-0 rounded-full border-2 border-onair/50 animate-ping" />
              )}
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-mono text-faint uppercase">AI Interviewer</p>
              <p className="text-xs text-muted">{aiSpeaking ? 'Speaking…' : 'Listening'}</p>
            </div>

            <AIWaveform active={aiSpeaking} />
          </div>

          {/* Current question text */}
          <div className="flex-1 flex flex-col justify-center w-full">
            {currentAIText && (
              <div className="bg-panel2 border border-hairline rounded-xl p-3 mt-4">
                <p className="text-xs font-mono text-onair uppercase mb-1.5">Current question</p>
                <p className="text-sm text-text leading-relaxed">{currentAIText.replace(/^⚡\s*/, '')}</p>
              </div>
            )}
          </div>

          {/* Mic + controls */}
          <div className="w-full space-y-3">

            {!speechSupported && (
              <p className="text-xs text-alert bg-alert/10 border border-alert/30 rounded-lg px-3 py-2 text-center">
                Use Chrome or Edge for voice recognition
              </p>
            )}

            {permError && (
              <p className="text-xs text-alert bg-alert/10 border border-alert/30 rounded-lg px-3 py-2 text-center">
                Microphone access denied — please allow it in your browser settings
              </p>
            )}

            {nudge && !listening && (
              <p className="text-xs text-faint font-mono text-center">still listening… take your time</p>
            )}

            {/* Mic button */}
            <div className="flex flex-col items-center gap-3">
              <MicPulse active={listening} />

              {!listening ? (
                <button
                  onClick={handleStartAnswer}
                  disabled={aiSpeaking}
                  className="w-full flex items-center justify-center gap-2 bg-signal text-ink font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-signal/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Start speaking
                </button>
              ) : (
                <button
                  onClick={handleDoneAnswering}
                  className="w-full flex items-center justify-center gap-2 bg-alert text-ink font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-alert/80 transition-colors"
                >
                  Done answering
                </button>
              )}
            </div>

            {/* Secondary actions */}
            {lastResult && (
              <div className="flex gap-2">
                <button
                  onClick={handleRedo}
                  className="flex-1 text-sm text-muted hover:text-text border border-hairline rounded-xl px-3 py-2 transition-colors"
                >
                  Redo
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 text-sm bg-onair/10 text-onair border border-onair/30 rounded-xl px-3 py-2 hover:bg-onair/20 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: transcript ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          <div className="shrink-0 px-5 py-3 border-b border-hairline">
            <p className="text-xs font-mono text-faint uppercase tracking-widest">Live Transcript</p>
          </div>

          {/* Transcript scroll area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scroll">
            {transcript.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-sm text-faint">Transcript will appear here…</p>
              </div>
            )}

            {transcript.map((msg) => (
              <Bubble key={msg.id} role={msg.role} text={msg.text} isInterim={false} />
            ))}

            {/* Live interim user bubble */}
            {listening && interimText && (
              <Bubble role="user" text={interimText} isInterim={true} />
            )}

            {/* AI typing indicator */}
            {aiSpeaking && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-onair/20 border border-onair/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-onair text-xs font-bold">AI</span>
                </div>
                <div className="bg-panel2 border border-hairline rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-onair/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Text input fallback */}
          <div className="shrink-0 px-5 py-3 border-t border-hairline bg-[#0a0a0a]/50 flex gap-2">
            <input
              type="text"
              placeholder={listening ? "Speak your answer or type here..." : "Type your answer..."}
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typedAnswer.trim()) {
                  handleTextSubmit();
                }
              }}
              disabled={aiSpeaking}
              className="flex-1 bg-[#141414] border border-hairline rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-onair text-white disabled:opacity-40"
            />
            <button
              onClick={handleTextSubmit}
              disabled={aiSpeaking || !typedAnswer.trim()}
              className="bg-onair text-ink font-semibold rounded-xl px-4 py-2 text-xs hover:bg-onair2 transition-colors disabled:opacity-40"
            >
              Submit
            </button>
          </div>

          {/* Score preview at bottom */}
          {lastResult && (
            <div className="shrink-0 px-5 pb-5 pt-2 border-t border-hairline">
              <ScorePreview result={lastResult} />
            </div>
          )}
        </div>
      </div>

      {/* Onboarding / Instruction Modal Overlay */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />
            <div className="text-center space-y-2 relative z-10">
              <div className="w-12 h-12 rounded-full bg-onair/10 border border-onair/30 flex items-center justify-center mx-auto text-xl">🎙️</div>
              <h3 className="text-lg font-bold text-white tracking-tight">Interview Instructions</h3>
              <p className="text-xs text-zinc-400">Welcome to your adaptive AI mock interview session. Here is how it works:</p>
            </div>
            
            <div className="space-y-3.5 relative z-10 text-xs text-zinc-300">
              <div className="flex gap-3">
                <span className="text-onair font-bold">1.</span>
                <p><span className="text-white font-semibold">Speak Naturally:</span> Click <span className="text-white font-medium">"Start speaking"</span>, say your answer aloud, then click <span className="text-white font-medium">"Done answering"</span> when complete.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-onair font-bold">2.</span>
                <p><span className="text-white font-semibold">Adaptive Follow-ups:</span> The AI acts like a real interviewer. It will probe your claims, ask for details, or challenge weak points.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-onair font-bold">3.</span>
                <p><span className="text-white font-semibold">Text Mode Fallback:</span> If your microphone isn't working or browser speech recognition is unsupported, simply type your responses in the text input box at the bottom.</p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="relative z-10 w-full bg-white text-black font-semibold rounded-xl py-2.5 text-xs hover:bg-zinc-200 transition-colors"
            >
              Start Interview
            </button>
          </div>
        </div>
      )}
      {/* End Interview Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />
            <div className="text-center space-y-2 relative z-10">
              <div className="w-12 h-12 rounded-full bg-alert/10 border border-alert/30 flex items-center justify-center mx-auto text-xl text-alert">⚠️</div>
              <h3 className="text-lg font-bold text-white tracking-tight">End Interview Early?</h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to end the interview early? You will not be able to continue and it will generate the final report for the answered questions.
              </p>
            </div>

            <div className="flex gap-3 relative z-10">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 bg-panel2 border border-hairline text-white font-semibold rounded-xl py-2.5 text-xs hover:bg-white/5 transition-colors"
              >
                No, continue
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowEndConfirm(false);
                  await handleFinish();
                }}
                className="flex-1 bg-alert text-ink font-semibold rounded-xl py-2.5 text-xs hover:bg-alert/80 transition-colors animate-pulse"
              >
                Yes, end early
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
