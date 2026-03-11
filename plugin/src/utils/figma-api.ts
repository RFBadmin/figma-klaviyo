// Figma node utilities

export function getSelectedEmailFrame(): FrameNode | null {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) return null;
  const node = selection[0];
  if (node.type !== 'FRAME') return null;

  const frame = node as FrameNode;

  // Validate email dimensions: typical email is 500–700px wide
  if (frame.width < 500 || frame.width > 700) return null;

  return frame;
}

export function getFrameById(id: string): FrameNode | null {
  const node = figma.getNodeById(id);
  if (!node || node.type !== 'FRAME') return null;
  return node as FrameNode;
}

export function isEmailFrame(frame: FrameNode): boolean {
  return frame.width >= 500 && frame.width <= 700;
}

export function getCurrentUser(): string {
  return figma.currentUser?.name ?? 'Unknown';
}

export function getCurrentUserEmail(): string {
  return figma.currentUser?.id ?? 'unknown';
}
