import { useEffect, useMemo, useState } from 'react';

const FULL_TEXT = 'Fibuca Trade Union Management Information System';
const FINAL_WORD = 'fibucatumis';
const DURATION_MS = 3000;

export default function LoadingIntro({ hold = false }) {
  const [typedCount, setTypedCount] = useState(0);
  const [showFinalWord, setShowFinalWord] = useState(false);

  useEffect(() => {
    const totalCharacters = FULL_TEXT.length;
    const stepDuration = Math.max(24, Math.floor(DURATION_MS / totalCharacters));

    const intervalId = window.setInterval(() => {
      setTypedCount((current) => {
        if (current >= totalCharacters) {
          window.clearInterval(intervalId);
          return current;
        }

        return current + 1;
      });
    }, stepDuration);

    const revealTimer = window.setTimeout(() => {
      setShowFinalWord(true);
    }, DURATION_MS * 0.76);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(revealTimer);
    };
  }, []);

  const typedText = useMemo(() => FULL_TEXT.slice(0, typedCount), [typedCount]);
  const writingProgress = Math.min(1, typedCount / FULL_TEXT.length);

  return (
    <div className="intro-stage" aria-live="polite" aria-label="Loading Fibuca Trade Union Management Information System">
      <div className="intro-aura intro-aura-left" />
      <div className="intro-aura intro-aura-right" />

      <div className="intro-card">
        <div className="intro-badge">3D Pencil Writing Intro</div>

        <div className="intro-writing-board">
          <div className="intro-writing-line">
            <span className="intro-typed-text">{typedText}</span>
            <span className="intro-cursor" />
            <span
              className="intro-pencil"
              style={{ left: `calc(${Math.max(4, writingProgress * 100)}% - 0.9rem)` }}
              aria-hidden="true"
            >
              <span className="intro-pencil-body" />
              <span className="intro-pencil-tip" />
              <span className="intro-pencil-eraser" />
              <span className="intro-pencil-shadow" />
            </span>
          </div>

          <div className={`intro-final-word ${showFinalWord ? 'is-visible' : ''} ${hold ? 'is-holding' : ''}`}>
            {FINAL_WORD}
          </div>
        </div>

        <div className="intro-breakdown">
          <span>Fibuca</span>
          <span>+</span>
          <span>Trade Union</span>
          <span>+</span>
          <span>Management Information System</span>
        </div>
      </div>
    </div>
  );
}