export default function RockArt({ mood = 50, energy = 70, happy = false }) {
  const moodNorm = Math.max(0, Math.min(100, mood));
  const energyNorm = Math.max(0, Math.min(100, energy));

  const cx = 160;
  const mouthY = 188;
  const mouthHalf = 22;
  const smileDepth = ((moodNorm - 50) / 50) * 18;
  const smileD = `M ${cx - mouthHalf} ${mouthY} Q ${cx} ${mouthY + smileDepth} ${cx + mouthHalf} ${mouthY}`;

  // Eye y-position — droops a couple px when low energy
  const eyeY = 158 + (energyNorm < 30 ? 3 : 0);

  // Irregular pebble outline — asymmetric, with a couple flat-ish facets
  const pebbleD =
    'M 64 222 ' +
    'C 46 200, 32 158, 50 112 ' +
    'C 64 78, 102 58, 138 56 ' +
    'C 175 54, 218 64, 248 88 ' +
    'C 274 110, 282 152, 274 192 ' +
    'C 268 220, 240 244, 206 248 ' +
    'C 168 252, 116 250, 86 240 ' +
    'C 70 235, 64 230, 64 222 Z';

  return (
    <svg
      viewBox="0 0 320 280"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      role="img"
      aria-label="a small grey pebble with a cute smiley face"
    >
      <defs>
        <radialGradient id="rockGrad" cx="35%" cy="22%" r="95%">
          <stop offset="0%" stopColor="#cfc1b0" />
          <stop offset="40%" stopColor="#a39080" />
          <stop offset="80%" stopColor="#6a5a4a" />
          <stop offset="100%" stopColor="#473a30" />
        </radialGradient>
        <radialGradient id="cheekGrad">
          <stop offset="0%" stopColor="#ff9aae" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff9aae" stopOpacity="0" />
        </radialGradient>
        <filter id="rockGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.4"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
        </filter>
        <clipPath id="rockClip">
          <path d={pebbleD} />
        </clipPath>
      </defs>

      {/* Soft ground shadow — sits outside the bobbing group */}
      <ellipse cx="160" cy="262" rx="98" ry="9" fill="#3d2817" opacity="0.13" />

      <g className={happy ? 'rock-body rock-happy' : 'rock-body'}>
        {/* Pebble body */}
        <path d={pebbleD} fill="url(#rockGrad)" />

        {/* Grain texture clipped to the pebble */}
        <g clipPath="url(#rockClip)">
          <rect x="0" y="0" width="320" height="280" filter="url(#rockGrain)" opacity="0.55" />
        </g>

        {/* Top-left highlight */}
        <ellipse cx="118" cy="92" rx="44" ry="20" fill="white" opacity="0.22" />
        <ellipse cx="100" cy="118" rx="14" ry="6" fill="white" opacity="0.14" />

        {/* Tiny rock-detail dots */}
        <circle cx="232" cy="106" r="2.6" fill="#241509" opacity="0.28" />
        <circle cx="252" cy="148" r="1.8" fill="#241509" opacity="0.22" />
        <circle cx="98" cy="206" r="2.2" fill="#241509" opacity="0.22" />
        <circle cx="200" cy="220" r="1.6" fill="#241509" opacity="0.18" />
        <circle cx="78" cy="158" r="1.4" fill="#241509" opacity="0.18" />

        {/* A couple of faint scratch lines */}
        <path
          d="M 88 200 Q 130 210 178 204"
          stroke="#241509"
          strokeWidth="0.8"
          fill="none"
          opacity="0.22"
        />
        <path
          d="M 200 178 Q 224 182 248 175"
          stroke="#241509"
          strokeWidth="0.7"
          fill="none"
          opacity="0.18"
        />
        <path
          d="M 155 100 Q 175 96 195 102"
          stroke="#241509"
          strokeWidth="0.6"
          fill="none"
          opacity="0.16"
        />

        {/* Small chipped notch on the right edge */}
        <path
          d="M 268 124 L 274 130 L 270 138 Z"
          fill="#241509"
          opacity="0.18"
        />

        {/* Cheeks */}
        <circle cx="105" cy="186" r="15" fill="url(#cheekGrad)" />
        <circle cx="215" cy="186" r="15" fill="url(#cheekGrad)" />

        {/* Left eye + sparkle, blinking together */}
        <g className="rock-eye" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <ellipse cx="135" cy={eyeY} rx="8" ry="9.5" fill="#241509" />
          <circle cx="138" cy={eyeY - 3} r="2.4" fill="white" />
          <circle cx="132" cy={eyeY + 4} r="1.2" fill="white" opacity="0.7" />
        </g>

        {/* Right eye + sparkle, blinking together */}
        <g className="rock-eye rock-eye-r" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <ellipse cx="185" cy={eyeY} rx="8" ry="9.5" fill="#241509" />
          <circle cx="188" cy={eyeY - 3} r="2.4" fill="white" />
          <circle cx="182" cy={eyeY + 4} r="1.2" fill="white" opacity="0.7" />
        </g>

        {/* Smile */}
        <path
          d={smileD}
          stroke="#241509"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
