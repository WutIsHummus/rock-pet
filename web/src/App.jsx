/**
 * Top-level layout. The two-column desktop grid puts the rock + bubble + stats
 * on the left and the chat forms + memories on the right; on mobile it stacks.
 *
 * State and websocket lifecycle live in `useRockAgent` (lib/agentClient.js).
 */

import { useEffect, useState } from 'react';
import { useRockAgent } from './lib/agentClient.js';
import RockArt from './components/RockArt.jsx';
import Bubble from './components/Bubble.jsx';
import Stats from './components/Stats.jsx';
import Chat from './components/Chat.jsx';
import Memories from './components/Memories.jsx';
import Footer from './components/Footer.jsx';
import Doodles from './components/Doodles.jsx';

export default function App() {
  const { state, connected, busy, errorMsg, feed, say } = useRockAgent();
  const happyKey = useHappyOnFeed(state.lastFed);

  return (
    <div className="scene-bg h-screen overflow-hidden relative">
      <Doodles />

      <main className="relative h-screen max-w-5xl mx-auto px-4 sm:px-8 py-3 sm:py-5 flex flex-col">
        <header className="text-center mb-2 sm:mb-3 shrink-0">
          <p className="font-hand text-blush text-lg sm:text-xl -rotate-3 inline-block leading-none">
            hi !!
          </p>
          <h1 className="font-display font-semibold text-cocoa-700 text-3xl sm:text-4xl leading-none mt-0.5">
            this is <span className="text-blush">a rock</span>
          </h1>
        </header>

        <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 sm:gap-8 items-center grow min-h-0">
          {/* Left column: bubble (above), rock, stats. The bubble's tail points
              down at the rock — keeping them in the same column ensures the
              tail lands on the rock at any breakpoint. */}
          <div className="flex flex-col items-center justify-center min-h-0">
            <Bubble key={state.currentThoughtAt} thought={state.currentThought} />
            <div className="w-44 sm:w-56 lg:w-64 shrink-0" key={`rock-${happyKey}`}>
              <RockArt mood={state.mood} energy={state.energy} happy={happyKey > 0} />
            </div>
            <Stats mood={state.mood} energy={state.energy} age={state.age} />
          </div>

          {/* Right column: chat forms + recent memories. */}
          <div className="flex flex-col gap-3 sm:gap-4 min-h-0">
            <Chat
              busy={busy}
              connected={connected}
              errorMsg={errorMsg}
              onFeed={feed}
              onSay={say}
            />
            <Memories memories={state.memories} />
          </div>
        </div>

        <Footer connected={connected} />
      </main>
    </div>
  );
}

/**
 * Bumps a counter every time the rock gets fed. Components key on it to
 * remount and re-trigger the "happy hop" CSS animation.
 */
function useHappyOnFeed(lastFed) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (lastFed) setCount((c) => c + 1);
  }, [lastFed]);
  return count;
}
