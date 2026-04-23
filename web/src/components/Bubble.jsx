/**
 * The rock's speech bubble. Pops in on every new thought (the parent re-keys
 * by `currentThoughtAt` so React remounts and the CSS animation re-plays).
 */
export default function Bubble({ thought }) {
  return (
    <div className="bubble bubble-pop max-w-xs sm:max-w-sm mb-3 sm:mb-4">
      <p className="font-display font-medium italic text-cocoa-700 text-base sm:text-lg leading-snug text-center">
        {thought}
      </p>
    </div>
  );
}
