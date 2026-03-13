import { useEffect, useMemo, useState } from 'react';

const LOADER_TITLE = 'FIBUCA Trade Union MIS';
const LOADER_SUBTITLE = 'Preparing secure member portal';
const DURATION_MS = 4000;

export default function LoadingIntro({ hold = false }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (hold) {
      setProgress(100);
      return undefined;
    }

    let frameId = 0;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const next = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(next);

      if (next < 100) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [hold]);

  const textCount = useMemo(() => {
    const visibleRatio = Math.min(1, progress / 82);
    return Math.floor(LOADER_TITLE.length * visibleRatio);
  }, [progress]);

  const typedTitle = useMemo(() => LOADER_TITLE.slice(0, textCount), [textCount]);
  const showSubtitle = progress > 38;

  return (
    <div className="intro-stage" aria-live="polite" aria-label="Loading FIBUCA portal">
      <div className="intro-grid-glow" />

      <div className="intro-card-simple">
        <div className="intro-logo-people" role="img" aria-label="FIBUCA logo people animation">
          <img src="/images/logo-watermark.png" alt="FIBUCA logo" className="intro-logo-image" />

          <div className="intro-people-group intro-people-group-left">
            <span className="intro-person intro-person-1" />
            <span className="intro-person intro-person-2" />
            <span className="intro-person intro-person-3" />
          </div>

          <div className="intro-people-group intro-people-group-right">
            <span className="intro-person intro-person-4" />
            <span className="intro-person intro-person-5" />
            <span className="intro-person intro-person-6" />
          </div>
        </div>

        <div className="intro-text-block">
          <p className="intro-title-text">{typedTitle}<span className="intro-cursor" /></p>
          <p className={`intro-subtitle ${showSubtitle ? 'is-visible' : ''}`}>{LOADER_SUBTITLE}</p>
        </div>

        <div className="intro-download-wrap" aria-label="Loading progress">
          <div className="intro-download-track">
            <span className="intro-download-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="intro-progress-label">Downloading modules... {Math.round(progress)}%</p>
        </div>
      </div>
    </div>
  );
}