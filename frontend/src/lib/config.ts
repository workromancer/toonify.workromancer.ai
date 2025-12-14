/**
 * Frontend Configuration
 * 
 * Enforces presence of required environment variables.
 * Usage: import config from '@/lib/config';
 */

const validateEnv = (key: string, value: string | undefined): string => {
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

// We only enforce variables that MUST be present for the app to function basics.
// NEXT_PUBLIC_API_URL is critical for API calls.

export const config = {
    // Determine API_URL. We enforce it unless you really want to hardcode fallback logic elsewhere.
    // Next.js replaces process.env.NEXT_PUBLIC_API_BASE_URL at build time, so we must access it directly.
    API_URL: validateEnv('NEXT_PUBLIC_API_BASE_URL', process.env.NEXT_PUBLIC_API_BASE_URL), 
    
    // Internal Backend URL (only used server-side usually, but might be needed)
    // We can make this optional if it's not strictly required for client-side rendering,
    // but requested was "all injected values".
    INTERNAL_BACKEND_URL: process.env.INTERNAL_BACKEND_URL || '', 
} as const;
