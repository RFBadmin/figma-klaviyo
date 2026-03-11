/// <reference types="@figma/plugin-typings" />

import { saveSliceData, loadSliceData } from './utils/metadata';
import { exportSlices } from './utils/export';
import { getSelectedEmailFrame } from './utils/figma-api';
import type { UIMessage, SliceData } from './types';

// ─── Plugin Init ──────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 400, height: 600, title: 'Figma → Klaviyo' });

// Notify UI of currently selected frame on launch
notifyFrameSelection();

// ─── Selection Change Listener ────────────────────────────────────────────────

figma.on('selectionchange', () => {
  notifyFrameSelection();
});

// ─── Message Handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: UIMessage) => {
  try {
    switch (msg.type) {

      case 'GET_SELECTED_FRAME': {
        notifyFrameSelection();
        break;
      }

      case 'EXPORT_SLICES': {
        const exports = await exportSlices(msg.frameId, msg.slices);
        figma.ui.postMessage({ type: 'EXPORT_COMPLETE', data: exports });
        break;
      }

      case 'SAVE_SLICE_DATA': {
        saveSliceData(msg.frameId, msg.data);
        figma.ui.postMessage({ type: 'SLICE_DATA_SAVED' });
        break;
      }

      case 'LOAD_SLICE_DATA': {
        const data = loadSliceData(msg.frameId);
        figma.ui.postMessage({ type: 'SLICE_DATA_LOADED', data });
        break;
      }

      case 'RESIZE_PLUGIN': {
        figma.ui.resize(msg.width, msg.height);
        break;
      }

      case 'GET_USER_INFO': {
        figma.ui.postMessage({
          type: 'USER_INFO',
          name: figma.currentUser?.name ?? 'Unknown'
        });
        break;
      }

      case 'SAVE_KLAVIYO_KEY': {
        await figma.clientStorage.setAsync('klaviyo_api_key', msg.key);
        figma.ui.postMessage({ type: 'KLAVIYO_KEY_SAVED' });
        break;
      }

      case 'GET_KLAVIYO_KEY': {
        const key = await figma.clientStorage.getAsync('klaviyo_api_key') as string | undefined;
        figma.ui.postMessage({ type: 'KLAVIYO_KEY_LOADED', key: key ?? null });
        break;
      }

      case 'CLOSE_PLUGIN': {
        figma.closePlugin();
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    figma.ui.postMessage({ type: 'ERROR', message });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notifyFrameSelection(): void {
  const frame = getSelectedEmailFrame();

  if (frame) {
    // Try to load existing slice data for this frame
    const existingData = loadSliceData(frame.id);

    figma.ui.postMessage({
      type: 'FRAME_SELECTED',
      data: {
        id: frame.id,
        name: frame.name,
        width: frame.width,
        height: frame.height,
        existingSliceData: existingData
      }
    });
  } else {
    figma.ui.postMessage({ type: 'NO_FRAME_SELECTED' });
  }
}
