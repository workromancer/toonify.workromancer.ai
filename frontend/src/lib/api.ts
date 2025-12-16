import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/components/ui/toaster';

// Environment variable for API URL or default to localhost
import { config } from '@/lib/config';

// Environment variable for API URL or default to localhost
const API_URL = config.API_URL;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        console.log("API Request Interceptor - URL:", config.url, "Token:", token ? "Present" : "Missing");
        if (token && token !== 'undefined' && token !== 'null') {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // Explicitly remove it if it was set by default
            delete config.headers.Authorization;
        }

        // Set Accept-Language from cookie if available
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE=([^;]+)'));
            if (match) {
                config.headers['Accept-Language'] = match[2];
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Add response interceptor for global error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            if (status === 401) {
                // Check if the token has changed since the request was made (Race Condition protection)
                const currentToken = useAuthStore.getState().token;
                const requestToken = error.config?.headers?.Authorization?.replace('Bearer ', '');

                // Only logout/notify if the 401 comes from the CURRENT token.
                // If the user has already re-logged in (new token), ignore this old 401.
                if (currentToken && requestToken && currentToken !== requestToken) {
                    console.warn("Ignoring 401 from stale token");
                    return Promise.reject(error);
                }

                useAuthStore.getState().logout();
                // Let the UI/Store handle the redirect via state change

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'sessionExpired' } }));
                }
            } else if (status === 403) {
                if (typeof window !== 'undefined') {
                    window.location.href = '/dashboard';
                    window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'accessDenied' } }));
                }
            } else if (status === 404) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'notFound' } }));
                }
            } else if (status === 402) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-recharge-modal'));
                    window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'insufficientCredits' } }));
                }
            } else if (status === 422) {
                let detailMsg = "Invalid input data.";
                if (data.detail && Array.isArray(data.detail)) {
                    detailMsg = data.detail.map((err: any) => `${err.loc.slice(1).join('.')} ${err.msg}`).join('\n');
                } else if (typeof data.detail === 'string') {
                    detailMsg = data.detail;
                }
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'validationError', message: detailMsg } }));
                }
            } else if (status >= 500) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'serverError' } }));
                }
            } else {
                const msg = data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : undefined;
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'default', message: msg } }));
                }
            }
        } else if (error.request) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('api-error', { detail: { type: 'networkError' } }));
            }
        }

        return Promise.reject(error);
    }
);

export default api;
