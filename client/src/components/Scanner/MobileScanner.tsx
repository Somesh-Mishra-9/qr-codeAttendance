import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { apiUrl } from '../../config/config';

const MobileScanner: React.FC = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [type, setType] = useState<'in' | 'out'>('in');
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
    const [availableCameras, setAvailableCameras] = useState<{deviceId: string, label: string}[]>([]);
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerDivRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Initialize scanner
        if (scannerDivRef.current) {
            scannerRef.current = new Html5Qrcode('scanner-view');
            
            // Check for permissions
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(() => {
                    setCameraPermission('granted');
                    return navigator.mediaDevices.enumerateDevices();
                })
                .then(devices => {
                    const cameras = devices.filter(device => device.kind === 'videoinput')
                        .map(device => ({
                            deviceId: device.deviceId,
                            label: device.label || `Camera ${device.deviceId.slice(0, 5)}`
                        }));
                    
                    setAvailableCameras(cameras);
                    if (cameras.length > 0) {
                        // Default to back camera if available
                        const backCamera = cameras.find(camera => 
                            camera.label.toLowerCase().includes('back') || 
                            camera.label.toLowerCase().includes('rear'));
                        
                        setActiveCameraId(backCamera?.deviceId || cameras[0].deviceId);
                    }
                })
                .catch(error => {
                    setCameraPermission('denied');
                    setCameraError(`Camera access denied: ${error.message}`);
                });
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
                    .catch(error => console.error('Error stopping scanner:', error));
            }
        };
    }, []);

    useEffect(() => {
        // Start or stop scanner based on state
        if (scanning && activeCameraId && scannerRef.current) {
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            scannerRef.current.start(
                { deviceId: { exact: activeCameraId } },
                config,
                handleQRCodeSuccess,
                handleQRCodeError
            ).catch(error => {
                console.error('Scanner start error:', error);
                setScanning(false);
                setCameraError(`Failed to start camera: ${error.message}`);
            });
        } else if (!scanning && scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop()
                .catch(error => console.error('Error stopping scanner:', error));
        }
    }, [scanning, activeCameraId]);

    const handleQRCodeSuccess = async (decodedText: string) => {
        if (lastScanned === decodedText) return;
        setLastScanned(decodedText);
        
        try {
            const response = await fetch(`${apiUrl}/attendance/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    qrCode: decodedText,
                    type
                })
            });

            if (response.ok) {
                const result = await response.json();
                setScanning(false);
                setSuccessMessage(`Attendance marked successfully for ${result.attendee.name}!`);
                
                // Reset after success
                setTimeout(() => {
                    setSuccessMessage(null);
                    setLastScanned(null);
                }, 3000);
            } else {
                const error = await response.json();
                setCameraError(error.message || 'Failed to mark attendance');
                
                // Clear error after delay
                setTimeout(() => {
                    setCameraError(null);
                    setLastScanned(null);
                }, 3000);
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            setCameraError('Error connecting to server');
            
            // Clear error after delay
            setTimeout(() => {
                setCameraError(null);
                setLastScanned(null);
            }, 3000);
        }
    };

    const handleQRCodeError = (error: string) => {
        // Ignore frequent scan errors
        console.debug('QR scan error:', error);
    };

    const startScanning = () => {
        setScanning(true);
        setCameraError(null);
        setSuccessMessage(null);
    };

    const stopScanning = () => {
        setScanning(false);
    };

    const switchCamera = () => {
        if (scanning && scannerRef.current) {
            stopScanning();
        }
        
        // Find the next camera in the list
        if (availableCameras.length > 1 && activeCameraId) {
            const currentIndex = availableCameras.findIndex(c => c.deviceId === activeCameraId);
            const nextIndex = (currentIndex + 1) % availableCameras.length;
            setActiveCameraId(availableCameras[nextIndex].deviceId);
        }
    };

    return (
        <div className="mobile-scanner-container">
            <h2>Mobile QR Scanner</h2>
            
            <div className="scanner-type-selector">
                <label>
                    <input
                        type="radio"
                        value="in"
                        checked={type === 'in'}
                        onChange={(e) => setType('in')}
                    /> Check In
                </label>
                <label>
                    <input
                        type="radio"
                        value="out"
                        checked={type === 'out'}
                        onChange={(e) => setType('out')}
                    /> Check Out
                </label>
            </div>
            
            {cameraPermission === 'denied' && (
                <div className="camera-permission-denied">
                    <p>Camera access is required to scan QR codes.</p>
                    <p>Please enable camera access in your browser settings and reload this page.</p>
                </div>
            )}
            
            {cameraPermission === 'granted' && (
                <>
                    <div className="scanner-controls">
                        {!scanning ? (
                            <button onClick={startScanning} className="scan-button">
                                Start Scanning
                            </button>
                        ) : (
                            <button onClick={stopScanning} className="scan-button stop">
                                Stop Scanning
                            </button>
                        )}
                        
                        {availableCameras.length > 1 && (
                            <button onClick={switchCamera} className="switch-camera-button">
                                Switch Camera
                            </button>
                        )}
                    </div>
                    
                    <div id="scanner-view" ref={scannerDivRef} className="scanner-view"></div>
                    
                    {cameraError && (
                        <div className="error-message">
                            {cameraError}
                        </div>
                    )}
                    
                    {successMessage && (
                        <div className="success-message">
                            {successMessage}
                        </div>
                    )}
                    
                    <p className="scanner-help-text">
                        {scanning 
                            ? `Position the QR code in the center of the camera view to mark ${type === 'in' ? 'arrival' : 'departure'}`
                            : 'Press Start Scanning to begin'}
                    </p>
                </>
            )}
            
            <button onClick={() => navigate('/dashboard')} className="back-button">
                Back to Dashboard
            </button>
        </div>
    );
};

export default MobileScanner;