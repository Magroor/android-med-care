"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// Browser support never changes at runtime, so there is nothing to subscribe to.
const noopSubscribe = () => () => {};

/** Dictate a clinical note with the browser's speech recognition and hand the text to the parent. */
export default function VoiceNote({ onText }: { onText: (text: string) => void }) {
  // Server snapshot assumes support so SSR markup matches the common (Chrome) case.
  const supported = useSyncExternalStore(noopSubscribe, () => Boolean(getSpeechCtor()), () => true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState("");
  const rec = useRef<SpeechRecognitionLike | null>(null);
  // Keep the latest callback so a long dictation session never calls a stale onText.
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    return () => rec.current?.abort(); // stop the microphone if the component unmounts
  }, []);

  function start() {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    setErr("");
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (finalText) onTextRef.current(finalText.trim());
      setInterim(interimText);
    };
    r.onerror = (e) => setErr(e.error === "not-allowed" ? "Microphone permission denied" : `Speech error: ${e.error}`);
    r.onend = () => {
      if (rec.current !== r) return; // a superseded session ended; don't clobber the new one's state
      rec.current = null;
      setListening(false);
      setInterim("");
    };
    rec.current?.abort(); // never leave a previous session holding the microphone
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch (e) {
      rec.current = null;
      setErr(e instanceof Error ? `Speech error: ${e.message}` : "Could not start dictation");
    }
  }

  if (!supported) return <p className="text-xs text-slate-400">Voice dictation isn&apos;t supported in this browser (try Chrome).</p>;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => (listening ? rec.current?.stop() : start())}
        className={`rounded-full px-3 py-1.5 text-sm font-medium ${listening ? "animate-pulse bg-red-600 text-white" : "bg-teal-50 text-teal-800"}`}
      >
        {listening ? "⏹ Stop dictation" : "🎙 Dictate"}
      </button>
      {interim && <span className="truncate text-xs italic text-slate-500">{interim}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
