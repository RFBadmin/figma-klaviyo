// ─── Slice & Design Data ──────────────────────────────────────────────────────

export interface Slice {
  id: string;
  name: string;
  y_start: number;
  y_end: number;
  alt_text: string;
  compressed_url?: string;
  klaviyo_url?: string;
  link?: string;
}

export interface SliceData {
  version: string;
  created_by: string;
  created_at: string;
  frame_id: string;
  frame_name: string;
  slices: Slice[];
  status: 'draft' | 'ready' | 'pushed';
  source?: 'ai' | 'figma_nodes';
}

export interface SliceExport {
  id: string;
  name: string;
  image_base64: string;
  width: number;
  height: number;
}

// ─── Compression ──────────────────────────────────────────────────────────────

export interface CompressedSlice {
  id: string;
  name: string;
  original_size: number;
  compressed_size: number;
  reduction_percent: number;
  width: number;
  height: number;
  format: string;
  status: 'optimal' | 'good' | 'warning' | 'failed';
  warnings: string[];
  temp_url: string;
}

export interface CompressionSummary {
  total_original: number;
  total_compressed: number;
  total_reduction_percent: number;
  slice_count: number;
  passed_count: number;
  warning_count: number;
  failed_count: number;
}

export interface CompressionValidation {
  total_size_kb: number;
  target_kb: number;
  status: 'passed' | 'warning' | 'failed';
  message: string;
}

export interface CompressionRecommendation {
  slice: string;
  issue: string;
  suggestion: string;
}

export interface CompressResponse {
  compressed: CompressedSlice[];
  summary: CompressionSummary;
  validation: CompressionValidation;
  recommendations: CompressionRecommendation[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface SliceValidation {
  maxFileSize: number;   // 200KB hard limit
  warnFileSize: number;  // 100KB warning threshold
  minHeight: number;     // prevent micro-slices
  totalEmailTarget: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Klaviyo ──────────────────────────────────────────────────────────────────

export interface KlaviyoList {
  id: string;
  name: string;
  member_count: number;
}

export interface KlaviyoCampaignConfig {
  mode: 'template' | 'campaign';
  templateName: string;
  campaignName: string;
  subject: string;
  previewText: string;
  fromEmail: string;
  fromLabel: string;
  listId: string;
  sendTime?: string;
}

// ─── Frame Info (shared) ──────────────────────────────────────────────────────

export interface FrameData {
  id: string;
  name: string;
  width: number;
  height: number;
  existingSliceData?: SliceData | null;
  hasFigmaSlices?: boolean;
}

// ─── Messages (plugin ↔ UI) ───────────────────────────────────────────────────

export interface LayoutBand {
  name: string;
  y_start: number;
  y_end: number;
}

export type PluginMessage =
  | { type: 'ALL_FRAMES_LOADED'; data: FrameData[] }
  | { type: 'FRAMES_SELECTED'; data: FrameData[] }
  | { type: 'FRAME_SELECTED'; data: FrameData }
  | { type: 'NO_FRAME_SELECTED' }
  | { type: 'SLICE_DATA_LOADED'; data: SliceData }
  | { type: 'SLICE_DATA_SAVED' }
  | { type: 'EXPORT_COMPLETE'; data: SliceExport[] }
  | { type: 'FRAME_EXPORTED'; data: string; _reqId?: string }
  | { type: 'FRAME_LAYOUT'; bands: LayoutBand[]; frameHeight: number; _reqId?: string }
  | { type: 'FIGMA_SLICES_LOADED'; slices: Array<{ name: string; y_start: number; y_end: number; imageBase64: string }>; _reqId?: string }
  | { type: 'SLICE_NODES_CREATED'; slices: Array<{ name: string; y_start: number; y_end: number; imageBase64: string }>; _reqId?: string }
  | { type: 'USER_INFO'; name: string }
  | { type: 'KLAVIYO_KEY_LOADED'; key: string | null }
  | { type: 'KLAVIYO_KEY_SAVED' }
  | { type: 'ERROR'; message: string; _reqId?: string };

export type UIMessage =
  | { type: 'GET_ALL_FRAMES' }
  | { type: 'EXPORT_FRAME'; frameId: string; _reqId?: string }
  | { type: 'GET_FRAME_LAYOUT'; frameId: string; _reqId?: string }
  | { type: 'EXPORT_SLICES'; frameId: string; slices: Slice[] }
  | { type: 'SAVE_SLICE_DATA'; frameId: string; data: SliceData }
  | { type: 'LOAD_SLICE_DATA'; frameId: string }
  | { type: 'GET_SELECTED_FRAME' }
  | { type: 'RESIZE_PLUGIN'; width: number; height: number }
  | { type: 'SAVE_KLAVIYO_KEY'; key: string }
  | { type: 'GET_KLAVIYO_KEY' }
  | { type: 'GET_USER_INFO' }
  | { type: 'GET_FIGMA_SLICES'; frameId: string; _reqId?: string }
  | { type: 'CREATE_SLICE_NODES'; frameId: string; slices: Array<{ name: string; y_start: number; y_end: number }>; _reqId?: string }
  | { type: 'CLOSE_PLUGIN' };
