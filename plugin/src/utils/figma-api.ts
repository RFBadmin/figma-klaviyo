// Figma node utilities

export function getSelectedEmailFrame(): FrameNode | null {
  const frames = getSelectedEmailFrames();
  return frames.length === 1 ? frames[0] : null;
}

export function getSelectedEmailFrames(): FrameNode[] {
  return figma.currentPage.selection
    .filter(node => node.type === 'FRAME')
    .map(node => node as FrameNode)
    .filter(frame => frame.width >= 500 && frame.width <= 700);
}

export function getAllEmailFrames(): FrameNode[] {
  return figma.currentPage.children
    .filter(node => node.type === 'FRAME')
    .map(node => node as FrameNode)
    .filter(frame => frame.width >= 500 && frame.width <= 700);
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
