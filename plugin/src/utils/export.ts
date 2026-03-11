import type { Slice, SliceExport } from '../types';

export async function exportFrameAsPng(
  frameId: string,
  scale: number = 2
): Promise<Uint8Array> {
  const frame = figma.getNodeById(frameId) as FrameNode;
  if (!frame) throw new Error(`Frame ${frameId} not found`);

  const exportSettings: ExportSettingsImage = {
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale }
  };

  return await frame.exportAsync(exportSettings);
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function exportSlices(
  frameId: string,
  slices: Slice[]
): Promise<SliceExport[]> {
  const frame = figma.getNodeById(frameId) as FrameNode;
  if (!frame) throw new Error(`Frame ${frameId} not found`);

  const exports: SliceExport[] = [];

  for (const slice of slices) {
    const sliceHeight = slice.y_end - slice.y_start;

    // Create a temporary frame representing this slice region
    const sliceFrame = figma.createFrame();
    sliceFrame.name = `_temp_slice_${slice.name}`;
    sliceFrame.resize(frame.width, sliceHeight);
    sliceFrame.x = frame.x;
    sliceFrame.y = frame.y + slice.y_start;
    sliceFrame.fills = [];
    sliceFrame.clipsContent = true;

    // Clone visible children of the original frame into the slice frame
    for (const child of frame.children) {
      const childNode = child as SceneNode & { y: number; height: number };
      const childTop = childNode.y;
      const childBottom = childNode.y + childNode.height;

      // Only include children that overlap with this slice
      if (childBottom > slice.y_start && childTop < slice.y_end) {
        const cloned = child.clone();
        sliceFrame.appendChild(cloned);
        (cloned as SceneNode & { y: number }).y = childNode.y - slice.y_start;
      }
    }

    const exportSettings: ExportSettingsImage = {
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 } // 2x for retina
    };

    const bytes = await sliceFrame.exportAsync(exportSettings);

    exports.push({
      id: slice.id,
      name: slice.name,
      image_base64: uint8ArrayToBase64(bytes),
      width: frame.width,
      height: sliceHeight
    });

    // Cleanup temp frame
    sliceFrame.remove();
  }

  return exports;
}
