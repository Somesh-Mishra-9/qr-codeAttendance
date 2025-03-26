const env = process.env.NODE_ENV || 'development';

interface Config {
    apiUrl: string;
    appName: string;
}

const config: { [key: string]: Config } = {
    development: {
        apiUrl: 'http://localhost:5000/api',
        appName: 'QR Attendance (Dev)'
    },
    production: {
        apiUrl: process.env.REACT_APP_API_URL || 'https://your-production-api.com/api',
        appName: 'QR Attendance'
    },
    test: {
        apiUrl: 'http://localhost:5000/api',
        appName: 'QR Attendance (Test)'
    }
};

export const { apiUrl, appName } = config[env];
export { config };