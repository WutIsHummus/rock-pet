/**
 * Connection indicator + attribution.
 */
export default function Footer({ connected }) {
  return (
    <footer className="font-body text-cocoa-500 text-xs flex flex-wrap justify-center items-center gap-2 sm:gap-3 mt-2 shrink-0">
      <span className="flex items-center gap-2">
        <span className={connected ? 'conn-dot live' : 'conn-dot'} aria-hidden="true" />
        {connected ? 'connected' : 'looking for the rock…'}
      </span>
      <span className="text-cocoa-300">·</span>
      <span>
        powered by{' '}
        <a
          href="https://workers.cloudflare.com/"
          className="text-blush font-bold hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          cloudflare
        </a>{' '}
        + <span className="font-bold">llama 3.3</span>
      </span>
    </footer>
  );
}
