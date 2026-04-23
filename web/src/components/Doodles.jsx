/**
 * Background decorations: a cute sun with a sleepy face, two drifting clouds,
 * and a few sparkles. Pure decoration, no interaction, marked aria-hidden.
 */

const SUN_RAYS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export default function Doodles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0" aria-hidden="true">
      <CuteSun className="top-2 right-2 sm:top-4 sm:right-6 w-20 h-20 sm:w-24 sm:h-24" />

      <Cloud
        className="doodle top-8 -left-2 sm:top-10 sm:left-4 w-24 h-14 text-white doodle-float"
        opacity={0.85}
      />
      <Cloud
        className="doodle bottom-12 -right-3 w-20 h-12 text-white doodle-float-2"
        opacity={0.7}
      />

      <Sparkle className="top-[28%] left-3 w-3 h-3 text-blush doodle-float-2" />
      <Sparkle className="top-[58%] right-3 w-3 h-3 text-mint-dark doodle-float" />
      <Sparkle className="bottom-[14%] left-6 w-3 h-3 text-sun-dark doodle-float-2" />
      <Sparkle className="bottom-[24%] right-2 w-3 h-3 text-blush doodle-float" />
    </div>
  );
}

function CuteSun({ className }) {
  return (
    <svg viewBox="0 0 120 120" className={`doodle ${className}`}>
      <g className="sun-wobble">
        <circle cx="60" cy="60" r="36" fill="#ffd166" opacity="0.25" />
        <g className="sun-rays">
          {SUN_RAYS.map((angle) => (
            <line
              key={angle}
              x1="60" y1="60" x2="60" y2="18"
              stroke="#ffc640"
              strokeWidth="4.5"
              strokeLinecap="round"
              transform={`rotate(${angle} 60 60)`}
            />
          ))}
        </g>
        <circle cx="60" cy="60" r="28" fill="#ffd166" />
        <ellipse cx="50" cy="50" rx="9" ry="5" fill="#fff3c5" opacity="0.7" />
        <ellipse cx="48" cy="68" rx="5" ry="3.5" fill="#ff9aae" opacity="0.7" />
        <ellipse cx="72" cy="68" rx="5" ry="3.5" fill="#ff9aae" opacity="0.7" />
        <path d="M 48 58 Q 52 54 56 58" stroke="#5e3a00" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M 64 58 Q 68 54 72 58" stroke="#5e3a00" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M 53 72 Q 60 78 67 72" stroke="#5e3a00" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

function Cloud({ className, opacity = 0.85 }) {
  return (
    <svg viewBox="0 0 120 70" className={className}>
      <g fill="currentColor" opacity={opacity}>
        <ellipse cx="32" cy="42" rx="22" ry="18" />
        <ellipse cx="62" cy="34" rx="26" ry="22" />
        <ellipse cx="92" cy="46" rx="20" ry="16" />
      </g>
    </svg>
  );
}

function Sparkle({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={`doodle ${className}`} fill="currentColor" aria-hidden="true">
      <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" />
    </svg>
  );
}
