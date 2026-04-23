/**
 * Recent feedings + utterances, displayed as colored chips.
 * Capped at 6 most recent; scrollbars are hidden globally so this just wraps.
 */
export default function Memories({ memories }) {
  if (memories.length === 0) return null;
  return (
    <div className="min-h-0">
      <p className="font-hand text-cocoa-500 text-base mb-1.5">things you&apos;ve given it</p>
      <div className="flex gap-1.5 flex-wrap">
        {memories.slice(0, 6).map((m, i) => (
          <span
            key={`${m.at}-${i}`}
            className={`chip ${m.kind === 'fed' ? 'chip-fed' : 'chip-said'} text-xs`}
          >
            <span className="chip-tag">{m.kind}</span>
            <span className="truncate max-w-[10rem]">{m.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
