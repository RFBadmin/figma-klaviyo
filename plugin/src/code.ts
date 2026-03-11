/// <reference types="@figma/plugin-typings" />

import { saveSliceData, loadSliceData } from './utils/metadata';
import { uint8ArrayToBase64 } from './utils/export';
import { getSelectedEmailFrames } from './utils/figma-api';
import type { UIMessage } from './types';

// ─── Plugin Init ──────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 400, height: 600, title: 'Figma → Klaviyo' });

// Notify UI of currently selected frame(s) on launch
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

      case 'EXPORT_FRAME': {
        const frameNode = figma.getNodeById(msg.frameId) as FrameNode;
        if (!frameNode) throw new Error(`Frame ${msg.frameId} not found`);
        const bytes = await frameNode.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 }
        });
        figma.ui.postMessage({ type: 'FRAME_EXPORTED', data: uint8ArrayToBase64(bytes) });
        break;
      }

      case 'GET_FRAME_LAYOUT': {
        const layoutFrame = figma.getNodeById(msg.frameId) as FrameNode;
        if (!layoutFrame) throw new Error(`Frame ${msg.frameId} not found`);
        const frameAbsY = layoutFrame.absoluteBoundingBox?.y ?? 0;
        const bands = computeSliceBands(layoutFrame, frameAbsY, layoutFrame.height);
        figma.ui.postMessage({ type: 'FRAME_LAYOUT', bands, frameHeight: layoutFrame.height });
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

// ─── Node-based Slice Band Computation ───────────────────────────────────────

/**
 * Walk the frame's children (recursing into groups/frames if needed) and
 * return merged vertical bands that correspond to natural slice boundaries.
 * Never cuts through content — uses actual node bounding boxes.
 */
function computeSliceBands(
  frame: FrameNode,
  frameAbsY: number,
  frameHeight: number
): Array<{ name: string; y_start: number; y_end: number }> {
  const raw = collectChildBands(frame.children, frameAbsY, frameHeight);

  // If the whole frame collapsed into ≤1 band (e.g. one giant group), recurse one level deeper
  if (raw.length <= 1 && frame.children.length === 1) {
    const only = frame.children[0];
    if ('children' in only) {
      const deeper = collectChildBands((only as FrameNode).children, frameAbsY, frameHeight);
      if (deeper.length > 1) raw.splice(0, raw.length, ...deeper);
    }
  }

  // Sort by y_start
  raw.sort((a, b) => a.y_start - b.y_start);

  // Merge overlapping / nearly-adjacent bands (≤8 px gap)
  const merged: typeof raw = [];
  for (const band of raw) {
    if (merged.length === 0) {
      merged.push({ ...band });
    } else {
      const last = merged[merged.length - 1];
      if (band.y_start <= last.y_end + 8) {
        last.y_end = Math.max(last.y_end, band.y_end);
      } else {
        merged.push({ ...band });
      }
    }
  }

  if (merged.length === 0) {
    return [{ name: 'full_email', y_start: 0, y_end: frameHeight }];
  }

  // Absorb gaps into adjacent bands instead of creating spacer slices:
  // first band starts at 0, each band's end extends to meet the next band's start,
  // and the last band ends at frameHeight.
  merged[0].y_start = 0;
  for (let i = 0; i < merged.length - 1; i++) {
    const mid = Math.round((merged[i].y_end + merged[i + 1].y_start) / 2);
    merged[i].y_end = mid;
    merged[i + 1].y_start = mid;
  }
  merged[merged.length - 1].y_end = frameHeight;

  return merged;
}

function collectChildBands(
  children: ReadonlyArray<SceneNode>,
  frameAbsY: number,
  frameHeight: number
): Array<{ name: string; y_start: number; y_end: number }> {
  const bands: Array<{ name: string; y_start: number; y_end: number }> = [];
  for (const child of children) {
    if (!child.visible) continue;
    const bbox = child.absoluteBoundingBox;
    if (!bbox) continue;
    const y_start = Math.max(0, Math.round(bbox.y - frameAbsY));
    const y_end = Math.min(frameHeight, Math.round(bbox.y - frameAbsY + bbox.height));
    if (y_end > y_start) {
      bands.push({ name: child.name, y_start, y_end });
    }
  }
  return bands;
}

// ─────────────────────────────────────────────────────────────────────────────

function notifyFrameSelection(): void {
  const frames = getSelectedEmailFrames();

  if (frames.length > 0) {
    const data = frames.map(frame => ({
      id: frame.id,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      existingSliceData: loadSliceData(frame.id)
    }));
    figma.ui.postMessage({ type: 'FRAMES_SELECTED', data });
  } else {
    figma.ui.postMessage({ type: 'NO_FRAME_SELECTED' });
  }
}
