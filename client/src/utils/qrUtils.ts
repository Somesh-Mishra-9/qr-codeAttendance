interface QRCodeData {
    userId: string;
    timestamp: number;
    type: 'in' | 'out';
}

export const generateQRData = (userId: string, type: 'in' | 'out'): QRCodeData => ({
    userId,
    timestamp: Date.now(),
    type
});

export const isValidQRData = (data: unknown): data is QRCodeData => {
    if (typeof data !== 'object' || !data) return false;
    
    const qrData = data as QRCodeData;
    return (
        typeof qrData.userId === 'string' &&
        typeof qrData.timestamp === 'number' &&
        (qrData.type === 'in' || qrData.type === 'out') &&
        // QR code should not be older than 5 minutes
        Date.now() - qrData.timestamp < 5 * 60 * 1000
    );
};

export const parseQRCode = (qrCode: string): QRCodeData | null => {
    try {
        const data = JSON.parse(qrCode);
        return isValidQRData(data) ? data : null;
    } catch {
        return null;
    }
};