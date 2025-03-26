import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../config/config';
import jsQR from 'jsqr';

const WebcamScanner: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(true);
    const [type, setType] = useState<'in' | 'out'>('in');
    const [lastScanned, setLastScanned] = useState<string | null>(null);

    const processQRCode = async (qrCodeNumber: string) => {
        try {
            if (lastScanned === qrCodeNumber) {
                return;
            }
            setLastScanned(qrCodeNumber);
            
            console.log('QR Code Number:', qrCodeNumber);
            const response = await fetch(`${apiUrl}/attendance/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    qrCode: qrCodeNumber,
                    type
                })
            });

            if (response.ok) {
                setScanning(false);
                alert('Attendance marked successfully!');
                navigate('/dashboard');
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to mark attendance');
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            alert('Error marking attendance');
        } finally {
            setTimeout(() => setLastScanned(null), 2000);
        }
    };

    const capture = useCallback(() => {
        if (!scanning) return;

        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) return;

        // Convert base64 to image data for QR processing
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                processQRCode(code.data);
            }
        };
    }, [navigate, scanning]);

    React.useEffect(() => {
        const interval = setInterval(capture, 500); // Scan every 500ms
        return () => clearInterval(interval);
    }, [capture]);

    return (
        <div className="scanner-container">
            <h2>Webcam QR Scanner</h2>
            
            <div className="scanner-type-selector">
                <label>
                    <input
                        type="radio"
                        value="in"
                        checked={type === 'in'}
                        onChange={(e) => setType(e.target.value as 'in' | 'out')}
                    /> Check In
                </label>
                <label>
                    <input
                        type="radio"
                        value="out"
                        checked={type === 'out'}
                        onChange={(e) => setType(e.target.value as 'in' | 'out')}
                    /> Check Out
                </label>
            </div>

            <div className="scanner-wrapper">
                <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        width: 720,
                        height: 720,
                        facingMode: 'user'
                    }}
                />
            </div>
            <p className="scanner-help-text">
                Position the QR code in front of your camera to mark {type === 'in' ? 'arrival' : 'departure'}
            </p>
            <button onClick={() => navigate('/dashboard')} className="back-button">
                Back to Dashboard
            </button>
        </div>
    );
};

export default WebcamScanner;