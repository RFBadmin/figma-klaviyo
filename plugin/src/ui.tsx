import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { DesignerMode } from './components/DesignerMode';
import { TechMode } from './components/TechMode';
import type { SliceData } from './types';

type Mode = 'designer' | 'tech';

export interface FrameInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  existingSliceData?: SliceData | null;
}

function App() {
  const [mode, setMode] = useState<Mode>('designer');
  const [frames, setFrames] = useState<FrameInfo[]>([]);
  const [noFrameWarning, setNoFrameWarning] = useState(false);

  useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'FRAMES_SELECTED':
          setFrames(msg.data);
          setNoFrameWarning(false);
          break;

        case 'FRAME_SELECTED':
          // Backwards compat — wrap single frame in array
          setFrames([msg.data]);
          setNoFrameWarning(false);
          break;

        case 'NO_FRAME_SELECTED':
          setFrames([]);
          setNoFrameWarning(true);
          break;
      }
    };

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
          Select one or more email frames (500–700px wide) to get started.
        </div>
      )}

      <main class="plugin-content">
        {mode === 'designer'
          ? <DesignerMode frames={frames} />
          : <TechMode frame={frames[0] ?? null} />
        }
      </main>
    </div>
  );
}

render(<App />, document.getElementById('root')!);
