import type { SliceData } from '../types';

export function saveSliceData(frameId: string, data: SliceData): void {
  const frame = figma.getNodeById(frameId) as FrameNode;
  if (!frame) throw new Error(`Frame ${frameId} not found`);
  frame.setPluginData('klaviyo_slices', JSON.stringify(data));
}

export function loadSliceData(frameId: string): SliceData | null {
  const frame = figma.getNodeById(frameId) as FrameNode;
  if (!frame) return null;
  const data = frame.getPluginData('klaviyo_slices');
  return data ? JSON.parse(data) : null;
}

export function clearSliceData(frameId: string): void {
  const frame = figma.getNodeById(frameId) as FrameNode;
  if (!frame) return;
  frame.setPluginData('klaviyo_slices', '');
}
