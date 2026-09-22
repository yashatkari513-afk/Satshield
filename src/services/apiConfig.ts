/**
 * Centralized API & ML Backend Configuration for SATSHIELD AI
 * 
 * Target Backend: https://satshield.onrender.com
 * 
 * Resolution Priority:
 * 1. VITE_API_BASE_URL environment variable (from .env, .env.production, or cloud build settings)
 * 2. Window runtime global __SATSHIELD_API_BASE_URL__ (for container/runtime injection)
 * 3. Default production backend: https://satshield.onrender.com (when running on remote hosts)
 * 4. Relative root '' (for localhost Vite proxy)
 */

export const DEFAULT_BACKEND_URL = 'https://satshield.onrender.com';

export function getApiBaseUrl(): string {
  // 1. Check build-time / deployment environment variable
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Check window runtime variable (if injected by host)
  if (typeof window !== 'undefined') {
    const winUrl = (window as any).__SATSHIELD_API_BASE_URL__;
    if (winUrl && typeof winUrl === 'string' && winUrl.trim() !== '') {
      return winUrl.trim().replace(/\/+$/, '');
    }
  }

  // 3. Fallback for deployed production environments (e.g. Vercel, Netlify, Cloudflare Pages)
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return DEFAULT_BACKEND_URL;
  }

  // 4. Default for local Vite dev server
  return DEFAULT_BACKEND_URL;
}
