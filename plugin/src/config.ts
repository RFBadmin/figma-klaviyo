export const BACKEND_URL = 'https://figma-klaviyo-production.up.railway.app';
export const PLUGIN_SECRET = '8dc466e0667c558bea652e3343932e0997557425b91f22e70c0f5570a1548e09';

/** Base headers to include on every backend request. */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Plugin-Secret': PLUGIN_SECRET, ...extra };
}
