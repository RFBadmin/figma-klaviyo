/// <reference types="@figma/plugin-typings" />

import { saveSliceData, loadSliceData, clearSliceData } from './utils/metadata';
import { uint8ArrayToBase64 } from './utils/export';
import { getSelectedEmailFrames, getAllEmailFrames } from './utils/figma-api';
import type { UIMessage } from './types';

// ─── Plugin Init ──────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 400, height: 600, title: 'Figma → Klaviyo' });

// ─── Startup cleanup ─────────────────────────────────────────────────────────
// If slice nodes were deleted from the canvas while the plugin was closed,
// the pluginData ('klaviyo_slices') still sits on the frame node.
// Clear it now so the UI doesn't show stale "sliced" state.
for (const frame of getAllEmailFrames()) {
  const hasData = loadSliceData(frame.id);
  const hasNodes = frameHasFigmaSlices(frame);
  if (hasData && !hasNodes) {
    clearSliceData(frame.id);
  }
}

// Notify UI of all email frames on the current page on launch
// If frames are already selected, show only those; otherwise show all
const initialSelected = getSelectedEmailFrames();
if (initialSelected.length > 0) {
  const data = initialSelected.map(frame => ({
    id: frame.id,
    name: frame.name,
    width: frame.width,
    height: frame.height,
    existingSliceData: loadSliceData(frame.id),
    hasFigmaSlices: frameHasFigmaSlices(frame)
  }));
  figma.ui.postMessage({ type: 'FRAMES_SELECTED', data });
} else {
  notifyAllPageFrames();
}

// Refresh frame list when the user switches pages
figma.on('currentpagechange', () => {
  notifyAllPageFrames();
});

// ─── Selection Change Listener ────────────────────────────────────────────────

figma.on('selectionchange', () => {
  const selected = getSelectedEmailFrames();
  if (selected.length > 0) {
    const data = selected.map(frame => ({
      id: frame.id,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      existingSliceData: loadSliceData(frame.id),
      hasFigmaSlices: frameHasFigmaSlices(frame)
    }));
    figma.ui.postMessage({ type: 'FRAMES_SELECTED', data });
  } else {
    notifyAllPageFrames();
  }
});

// Re-notify UI when slice nodes are added or removed from the canvas.
// When slice nodes are deleted, also clear the persisted pluginData so stale
// slice definitions don't keep reappearing.
// Tracks which frames had slices so we can detect true→false transitions.
const frameSliceState = new Map<string, boolean>();
// Initialise from all frames on current page
for (const f of getAllEmailFrames()) {
  frameSliceState.set(f.id, frameHasFigmaSlices(f));
}

let docChangeTimer: ReturnType<typeof setTimeout> | null = null;
figma.on('documentchange', (event) => {
  const affectsNodes = event.documentChanges.some(
    c => c.type === 'DELETE' || c.type === 'CREATE' || c.type === 'PROPERTY_CHANGE'
  );
  if (!affectsNodes) return;
  if (docChangeTimer) clearTimeout(docChangeTimer);
  docChangeTimer = setTimeout(() => {
    docChangeTimer = null;

    // Check every email frame — if it USED to have slices but no longer does,
    // clear the persisted pluginData so it won't reload as "sliced" next time.
    for (const frame of getAllEmailFrames()) {
      const hadSlices = frameSliceState.get(frame.id) ?? false;
      const hasSlices = frameHasFigmaSlices(frame);
      if (hadSlices && !hasSlices) {
        clearSliceData(frame.id);
      }
      frameSliceState.set(frame.id, hasSlices);
    }

    // Re-send full frame list to UI
    const sel = getSelectedEmailFrames();
    if (sel.length > 0) {
      const data = sel.map(frame => ({
        id: frame.id,
        name: frame.name,
        width: frame.width,
        height: frame.height,
        existingSliceData: loadSliceData(frame.id),
        hasFigmaSlices: frameHasFigmaSlices(frame)
      }));
      figma.ui.postMessage({ type: 'FRAMES_SELECTED', data });
    } else {
      notifyAllPageFrames();
    }
  }, 400);
});

// ─── Message Handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: UIMessage) => {
  // Correlation ID — echoed back in every response so the UI can match
  // request→response pairs and avoid race conditions during batch operations.
  const reqId = (msg as any)._reqId as string | undefined;

  try {
    switch (msg.type) {

      case 'GET_ALL_FRAMES': {
        notifyAllPageFrames();
        break;
      }

      case 'GET_SELECTED_FRAME': {
        const sel = getSelectedEmailFrames();
        if (sel.length > 0) {
          const data = sel.map(frame => ({
            id: frame.id,
            name: frame.name,
            width: frame.width,
            height: frame.height,
            existingSliceData: loadSliceData(frame.id),
            hasFigmaSlices: frameHasFigmaSlices(frame)
          }));
          figma.ui.postMessage({ type: 'FRAMES_SELECTED', data });
        } else {
          notifyAllPageFrames();
        }
        break;
      }

      case 'EXPORT_FRAME': {
        const frameNode = figma.getNodeById(msg.frameId) as FrameNode;
        if (!frameNode) throw new Error(`Frame ${msg.frameId} not found`);
        const bytes = await frameNode.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 1 }
        });
        figma.ui.postMessage({ type: 'FRAME_EXPORTED', data: uint8ArrayToBase64(bytes), _reqId: reqId });
        break;
      }

      case 'GET_FRAME_LAYOUT': {
        const layoutFrame = figma.getNodeById(msg.frameId) as FrameNode;
        if (!layoutFrame) throw new Error(`Frame ${msg.frameId} not found`);
        const frameAbsY = layoutFrame.absoluteBoundingBox?.y ?? 0;
        const bands = computeSliceBands(layoutFrame, frameAbsY, layoutFrame.height);
        figma.ui.postMessage({ type: 'FRAME_LAYOUT', bands, frameHeight: layoutFrame.height, _reqId: reqId });
        break;
      }

      case 'GET_FIGMA_SLICES': {
        const frameNode = figma.getNodeById(msg.frameId) as FrameNode;
        if (!frameNode) throw new Error(`Frame ${msg.frameId} not found`);

        const frameAbsY = frameNode.absoluteBoundingBox?.y ?? 0;
        const frameAbsX = frameNode.absoluteBoundingBox?.x ?? 0;
        // Search recursively — slice nodes may be inside groups
        const sliceNodes = findSliceNodesRecursive(frameNode);

        if (sliceNodes.length === 0) {
          figma.ui.postMessage({ type: 'FIGMA_SLICES_LOADED', slices: [], _reqId: reqId });
          break;
        }

        // Parallel export at 1× (avoids sequential blocking of the plugin bridge)
        const figmaSlicesRaw = await Promise.all(
          sliceNodes.map(async (node, i) => {
            const bbox = node.absoluteBoundingBox;
            if (!bbox) return null;
            const y_start = Math.max(0, Math.round(bbox.y - frameAbsY));
            const y_end = Math.min(frameNode.height, Math.round(bbox.y - frameAbsY + bbox.height));
            if (y_end <= y_start) return null;
            const x_start = Math.max(0, Math.round(bbox.x - frameAbsX));
            const x_end = Math.min(frameNode.width, Math.round(bbox.x - frameAbsX + bbox.width));
            const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
            return { name: node.name || `slice_${i + 1}`, y_start, y_end, x_start, x_end, imageBase64: uint8ArrayToBase64(bytes) };
          })
        );
        const figmaSlices = figmaSlicesRaw.filter((s): s is NonNullable<typeof s> => s !== null);
        figmaSlices.sort((a, b) => a.y_start - b.y_start || a.x_start - b.x_start);
        figma.ui.postMessage({ type: 'FIGMA_SLICES_LOADED', slices: figmaSlices, _reqId: reqId });
        break;
      }

      case 'CREATE_SLICE_NODES': {
        const frameNode = figma.getNodeById(msg.frameId) as FrameNode;
        if (!frameNode) throw new Error(`Frame ${msg.frameId} not found`);

        // Remove ALL existing slice nodes (including nested) before recreating
        const existingSlices = findSliceNodesRecursive(frameNode);
        for (const node of existingSlices) node.remove();

        // Create a SliceNode for each slice (x coords supported for vertical splits)
        for (const slice of msg.slices) {
          const sliceNode = figma.createSlice();
          frameNode.appendChild(sliceNode);
          sliceNode.x = slice.x_start ?? 0;
          sliceNode.y = slice.y_start;
          sliceNode.resize(
            (slice.x_end ?? frameNode.width) - (slice.x_start ?? 0),
            slice.y_end - slice.y_start
          );
          sliceNode.name = slice.name;
        }

        // Parallel export at 1× (avoids sequential blocking of the plugin bridge)
        const createdNodes = (frameNode.children as SceneNode[])
          .filter(n => n.type === 'SLICE') as SliceNode[];
        const absY = frameNode.absoluteBoundingBox?.y ?? 0;
        const absX = frameNode.absoluteBoundingBox?.x ?? 0;
        const exportedSlicesRaw = await Promise.all(
          createdNodes.map(async (node) => {
            const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
            const bbox = node.absoluteBoundingBox;
            if (!bbox) return null;
            const y_start = Math.max(0, Math.round(bbox.y - absY));
            const y_end = Math.min(frameNode.height, Math.round(bbox.y - absY + bbox.height));
            const x_start = Math.max(0, Math.round(bbox.x - absX));
            const x_end = Math.min(frameNode.width, Math.round(bbox.x - absX + bbox.width));
            return { name: node.name, y_start, y_end, x_start, x_end, imageBase64: uint8ArrayToBase64(bytes) };
          })
        );
        const exportedSlices = exportedSlicesRaw.filter((s): s is NonNullable<typeof s> => s !== null);

        figma.ui.postMessage({ type: 'SLICE_NODES_CREATED', slices: exportedSlices, _reqId: reqId });
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
    figma.ui.postMessage({ type: 'ERROR', message, _reqId: reqId });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively find all visible SliceNode descendants of a container.
 * This handles slice nodes placed inside groups, not just direct children.
 */
function findSliceNodesRecursive(container: ChildrenMixin): SliceNode[] {
  const slices: SliceNode[] = [];
  for (const child of container.children as SceneNode[]) {
    if (!child.visible) continue;
    if (child.type === 'SLICE') {
      slices.push(child as SliceNode);
    } else if ('children' in child) {
      slices.push(...findSliceNodesRecursive(child as ChildrenMixin));
    }
  }
  return slices;
}

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
    let bbox: Rect | null;
    try { bbox = child.absoluteBoundingBox; } catch { continue; }
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

function frameHasFigmaSlices(frame: FrameNode): boolean {
  return findSliceNodesRecursive(frame).length > 0;
}

function notifyAllPageFrames(): void {
  const frames = getAllEmailFrames();
  const data = frames.map(frame => ({
    id: frame.id,
    name: frame.name,
    width: frame.width,
    height: frame.height,
    existingSliceData: loadSliceData(frame.id),
    hasFigmaSlices: frameHasFigmaSlices(frame)
  }));
  figma.ui.postMessage({ type: 'ALL_FRAMES_LOADED', data });
}
