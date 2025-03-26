const env = process.env.NODE_ENV || 'development';

interface Config {
    apiUrl: string;
    appName: string;
}

// Helper function to ensure API URL is correctly formatted
const formatApiUrl = (url: string): string => {
    // Remove trailing slash if present
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // If URL already ends with /api, don't add it again
    if (baseUrl.endsWith('/api')) {
        return baseUrl;
    }
    
    return `${baseUrl}/api`;
};

const config: { [key: string]: Config } = {
    development: {
        apiUrl: formatApiUrl('http://localhost:5000'),
        appName: 'QR Attendance (Dev)'
    },
    production: {
        apiUrl: formatApiUrl(process.env.REACT_APP_API_URL || 'https://your-production-api.com'),
        appName: 'QR Attendance'
    },
    test: {
        apiUrl: formatApiUrl('http://localhost:5000'),
        appName: 'QR Attendance (Test)'
    }
};

export const { apiUrl, appName } = config[env];
export { config };