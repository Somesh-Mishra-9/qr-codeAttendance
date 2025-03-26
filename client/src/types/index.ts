export interface AttendanceRecord {
    id: string;
    studentId: string;
    timestamp: Date;
}

export interface QRCodeData {
    studentId: string;
    name: string;
}

export interface User {
    id: string;
    username: string;
    role: 'admin' | 'user';
}

export interface AuthResponse {
    token: string;
    user: User;
}