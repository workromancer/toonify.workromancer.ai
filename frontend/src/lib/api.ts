import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/components/ui/toaster';

// Environment variable for API URL or default to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        // We'll read token from the store directly.
        // This ensures we get the token even if it's stored in a nested structure by persist middleware.
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
        let message = "An unexpected error occurred";
        let title = "Error";

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            if (status === 401) {
                // Optional: Handle unauthorized (e.g., redirect to login)
                // For now, just show error
                title = "Unauthorized";
                message = "Please log in again.";
            } else if (status === 403) {
                title = "Forbidden";
                message = "You do not have permission to perform this action.";
            } else if (status === 404) {
                title = "Not Found";
                message = "The requested resource was not found.";
            } else if (status === 422) {
                title = "Validation Error";
                if (data.detail && Array.isArray(data.detail)) {
                    // FastAPI validation error format
                    message = data.detail.map((err: any) => `${err.loc.slice(1).join('.')} ${err.msg}`).join('\n');
                } else if (typeof data.detail === 'string') {
                    message = data.detail;
                } else {
                    message = "Invalid input data.";
                }
            } else if (status >= 500) {
                title = "Server Error";
                message = "Something went wrong on the server. Please try again later.";
            } else if (data.detail) {
                message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            }
        } else if (error.request) {
            // The request was made but no response was received
            title = "Network Error";
            message = "Unable to connect to the server. Please check your internet connection.";
        }

        toast({
            title: title,
            description: message,
            variant: 'destructive',
        });

        return Promise.reject(error);
    }
);

export default api;
