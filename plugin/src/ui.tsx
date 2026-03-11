import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { DesignerMode } from './components/DesignerMode';
import { TechMode } from './components/TechMode';
import type { SliceData } from './types';

type Mode = 'designer' | 'tech';

interface FrameInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  existingSliceData?: SliceData | null;
}

function App() {
  const [mode, setMode] = useState<Mode>('designer');
  const [frame, setFrame] = useState<FrameInfo | null>(null);
  const [noFrameWarning, setNoFrameWarning] = useState(false);

  useEffect(() => {
    // Listen for messages from the Figma sandbox
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'FRAME_SELECTED':
          setFrame(msg.data);
          setNoFrameWarning(false);
          break;

        case 'NO_FRAME_SELECTED':
          setFrame(null);
          setNoFrameWarning(true);
          break;

        case 'SLICE_DATA_SAVED':
          // No-op: handled in DesignerMode
          break;
      }
    };

    // Ask sandbox for current selection on mount
    parent.postMessage({ pluginMessage: { type: 'GET_SELECTED_FRAME' } }, '*');
  }, []);

  return (
    <div class="plugin-root">
      <header class="plugin-header">
        <span class="plugin-title">Figma → Klaviyo</span>
        <span class="plugin-version">v1.0.0</span>
      </header>

      <nav class="mode-tabs">
        <button
          class={`mode-tab ${mode === 'designer' ? 'active' : ''}`}
          onClick={() => setMode('designer')}
        >
          Designer
        </button>
        <button
          class={`mode-tab ${mode === 'tech' ? 'active' : ''}`}
          onClick={() => setMode('tech')}
        >
          Tech 🔒
        </button>
      </nav>

      {noFrameWarning && (
        <div class="frame-warning">
          Select an email frame (500–700px wide) to get started.
        </div>
      )}

      <main class="plugin-content">
        {mode === 'designer'
          ? <DesignerMode frame={frame} />
          : <TechMode frame={frame} />
        }
      </main>
    </div>
  );
}

render(<App />, document.getElementById('root')!);
