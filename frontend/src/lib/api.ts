import axios from 'axios';

// Environment variable for API URL or default to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        // We'll read token from localStorage directly for now. 
        // Ideally use a store or cookie, but localStorage is simple for MVP.
        // Note: This runs on client side only effectively.
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
