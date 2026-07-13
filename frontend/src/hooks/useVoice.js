import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const SpeechRecognitionCtor =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice() {
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);   // user intent: keep listening
  const onPartialRef    = useRef(null);
  const onFinalRef      = useRef(null);
  const finalBufferRef  = useRef('');
  const audioRef        = useRef(null);    // currently-playing AI audio

  const [listening,       setListening]       = useState(false);
  const [aiSpeaking,      setAiSpeaking]      = useState(false);
  const [speechSupported] = useState(!!SpeechRecognitionCtor);

  /* ── Build and attach a fresh SpeechRecognition instance ── */
  function createRecognition() {
    if (!SpeechRecognitionCtor) return null;

    const rec = new SpeechRecognitionCtor();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = 'en-US';

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalBufferRef.current += t + ' ';
          onFinalRef.current?.(finalBufferRef.current.trim());
        } else {
          interim += t;
        }
      }
      onPartialRef.current?.(finalBufferRef.current + interim);
    };

    rec.onerror = (e) => {
      // 'no-speech' is harmless — Chrome fires it after silence; restart.
      // 'aborted' is fired when we call stop() ourselves — ignore.
      // 'not-allowed' / 'service-not-allowed' are real failures.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        console.error('[useVoice] Microphone permission denied:', e.error);
        shouldListenRef.current = false;
        setListening(false);
        return;
      }
      if (e.error !== 'aborted') {
        console.warn('[useVoice] recognition error (will restart):', e.error);
      }
    };

    // Chrome stops recognition after ~60s of continuous use or after a pause.
    // If the user still wants to speak, restart immediately.
    rec.onend = () => {
      if (shouldListenRef.current) {
        // Small delay to avoid rapid-fire restart loop on hard errors
        setTimeout(() => {
          if (shouldListenRef.current) {
            try {
              recognitionRef.current = createRecognition();
              recognitionRef.current?.start();
            } catch (err) {
              console.warn('[useVoice] restart failed:', err.message);
            }
          }
        }, 150);
      } else {
        setListening(false);
      }
    };

    return rec;
  }

  const startListening = useCallback((onPartial, onFinal) => {
    if (!SpeechRecognitionCtor) {
      console.warn('[useVoice] Web Speech API not supported.');
      return;
    }

    // Stop any existing session first
    recognitionRef.current?.stop();

    onPartialRef.current    = onPartial;
    onFinalRef.current      = onFinal;
    finalBufferRef.current  = '';
    shouldListenRef.current = true;

    const rec = createRecognition();
    if (!rec) return;

    recognitionRef.current = rec;

    try {
      rec.start();
      setListening(true);
    } catch (err) {
      console.error('[useVoice] start failed:', err.message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  /* ── TTS speak with AI-speaking state ── */
  const speak = useCallback(async (text) => {
    if (!text) return;

    // Stop any in-progress audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setAiSpeaking(true);

    const finish = () => setAiSpeaking(false);

    try {
      const result = await api.tts(text);
      if (!result.fallback && result.audioBase64) {
        const audio = new Audio(`data:${result.mime};base64,${result.audioBase64}`);
        audioRef.current = audio;
        audio.onended  = finish;
        audio.onerror  = finish;
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('[useVoice] TTS backend failed, using browser fallback:', err.message);
    }

    // Browser SpeechSynthesis fallback
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend   = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    } else {
      finish();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    speak,
    startListening,
    stopListening,
    listening,
    aiSpeaking,
    speechSupported,
  };
}
