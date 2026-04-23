import { useState } from 'react';

/**
 * Two input forms plus a small status line.
 *
 * Both inputs are local-state-only; submitting calls the parent's `onFeed` /
 * `onSay`, which forward to the agent over the websocket. Inputs disable
 * themselves while a request is in flight (`busy`) or the socket is down
 * (`!connected`).
 */
export default function Chat({ busy, connected, errorMsg, onFeed, onSay }) {
  const [feedInput, setFeedInput] = useState('');
  const [sayInput, setSayInput] = useState('');

  const submitFeed = (e) => {
    e.preventDefault();
    if (onFeed(feedInput)) setFeedInput('');
  };
  const submitSay = (e) => {
    e.preventDefault();
    if (onSay(sayInput)) setSayInput('');
  };

  const inputDisabled = busy || !connected;

  return (
    <div className="space-y-2">
      <form onSubmit={submitFeed} className="flex gap-2">
        <input
          value={feedInput}
          onChange={(e) => setFeedInput(e.target.value)}
          placeholder="feed it (a haiku, a sock, the color blue)"
          className="input-chunk flex-1 min-w-0 py-2 text-sm sm:text-base"
          maxLength={120}
          disabled={inputDisabled}
          aria-label="feed the rock"
        />
        <button
          type="submit"
          className="btn-chunk shrink-0 py-2 text-sm sm:text-base"
          disabled={inputDisabled || !feedInput.trim()}
        >
          feed!
        </button>
      </form>

      <form onSubmit={submitSay} className="flex gap-2">
        <input
          value={sayInput}
          onChange={(e) => setSayInput(e.target.value)}
          placeholder="say something (it might reply)"
          className="input-chunk flex-1 min-w-0 py-2 text-sm sm:text-base"
          maxLength={300}
          disabled={inputDisabled}
          aria-label="say something to the rock"
        />
        <button
          type="submit"
          className="btn-chunk btn-chunk-mint shrink-0 py-2 text-sm sm:text-base"
          disabled={inputDisabled || !sayInput.trim()}
        >
          say!
        </button>
      </form>

      <p className="font-hand text-center text-base h-5 leading-tight">
        {busy && <span className="text-cocoa-500">the rock is thinking…</span>}
        {!busy && errorMsg && <span className="text-blush-dark">{errorMsg}</span>}
      </p>
    </div>
  );
}
