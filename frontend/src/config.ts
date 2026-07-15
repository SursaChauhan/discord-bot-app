// Central configuration file for frontend environments
// VITE_API_URL can be set in production (e.g. Render environment variables)
// Falls back to empty string in development so the Vite local proxy works automatically.
export const API_BASE = (import.meta.env.VITE_API_URL as string) || '';
