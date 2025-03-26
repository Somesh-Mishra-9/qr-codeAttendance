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
    const [debug, setDebug] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(true); // Show debug by default
    const [domReady, setDomReady] = useState(false);
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerDivRef = useRef<HTMLDivElement | null>(null);
    const initializationAttempts = useRef(0);

    // This ensures DOM is ready
    useEffect(() => {
        setDebug("Component mounted, waiting for DOM to be ready...");
        // Set DOM ready in the next tick
        setTimeout(() => {
            setDomReady(true);
            setDebug("DOM should be ready now");
        }, 100);
    }, []);

    const initializeScanner = () => {
        if (!scannerDivRef.current) {
            setDebug("Scanner div reference is null. DOM element might not be ready.");
            return false;
        }

        try {
            setDebug(`Initializing scanner (attempt ${initializationAttempts.current + 1})...`);
            
            // Try to clean up any previous instance
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop().catch(() => {});
                    }
                    scannerRef.current.clear();
                } catch (e) {
                    // Ignore errors during cleanup
                }
                scannerRef.current = null;
            }
            
            // Verify DOM element exists before initializing
            const scannerElement = document.getElementById('scanner-view');
            if (!scannerElement) {
                setDebug("DOM element 'scanner-view' not found in the document");
                return false;
            }
            
            // Create a new scanner instance
            scannerRef.current = new Html5Qrcode('scanner-view');
            setDebug("Scanner initialized successfully");
            initializationAttempts.current++;
            return true;
        } catch (error) {
            setCameraError(`Failed to initialize scanner: ${error instanceof Error ? error.message : String(error)}`);
            setDebug(`Init error: ${error instanceof Error ? error.message : String(error)}`);
            initializationAttempts.current++;
            return false;
        }
    };

    const requestCameraPermission = async () => {
        try {
            setDebug("Requesting camera permissions...");
            await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraPermission('granted');
            setDebug("Camera permission granted. Enumerating devices...");
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices
                .filter(device => device.kind === 'videoinput')
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
                setDebug(`Found ${cameras.length} cameras. Selected: ${backCamera?.label || cameras[0].label}`);
                return true;
            } else {
                setDebug('No cameras found on device');
                setCameraError('No cameras found on your device');
                return false;
            }
        } catch (error) {
            setCameraPermission('denied');
            setCameraError(`Camera access denied: ${error instanceof Error ? error.message : String(error)}`);
            setDebug(`Camera permission error: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    };

    // Only run initialization when DOM is confirmed ready
    useEffect(() => {
        if (!domReady) return;

        setDebug("DOM is ready, initializing scanner after delay...");
        // Wait 2 seconds after DOM is ready to ensure HTML is fully rendered
        const initTimeout = setTimeout(async () => {
            setDebug("Attempting to initialize scanner now...");
            if (initializeScanner()) {
                await requestCameraPermission();
            } else {
                setDebug("First initialization attempt failed, retrying in 1 second...");
                // If the first attempt fails, try again after 1 second
                setTimeout(async () => {
                    if (initializeScanner()) {
                        await requestCameraPermission();
                    }
                }, 1000);
            }
        }, 2000);

        return () => {
            clearTimeout(initTimeout);
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop()
                        .catch(error => console.error('Error stopping scanner:', error));
                }
                try {
                    scannerRef.current.clear();
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        };
    }, [domReady]);

    useEffect(() => {
        // Start or stop scanner based on state
        if (scanning && activeCameraId && scannerRef.current) {
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            setDebug(`Starting scanner with camera ID: ${activeCameraId}`);
            scannerRef.current.start(
                { deviceId: { exact: activeCameraId } },
                config,
                handleQRCodeSuccess,
                handleQRCodeError
            ).catch(error => {
                console.error('Scanner start error:', error);
                setScanning(false);
                setCameraError(`Failed to start camera: ${error.message}`);
                setDebug(`Start scanner error: ${error.message}`);
                
                // Try to re-initialize the scanner if start fails
                setTimeout(() => {
                    if (initializationAttempts.current < 3) {
                        setDebug("Attempting to reinitialize scanner...");
                        if (initializeScanner()) {
                            setDebug("Scanner reinitialized. Try scanning again.");
                        }
                    }
                }, 1000);
            });
        } else if (!scanning && scannerRef.current && scannerRef.current.isScanning) {
            setDebug("Stopping scanner");
            scannerRef.current.stop()
                .catch(error => console.error('Error stopping scanner:', error));
        }
    }, [scanning, activeCameraId]);

    const handleQRCodeSuccess = async (decodedText: string) => {
        if (lastScanned === decodedText) return;
        setLastScanned(decodedText);
        setDebug(`Scanned code: ${decodedText}`);
        
        try {
            // Ensure API URL doesn't have double /api
            const url = `${apiUrl}/attendance/mark`;
            setDebug(`Calling API: ${url}`);
            
            const response = await fetch(url, {
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

            const result = await response.json();
            
            if (response.ok) {
                setScanning(false);
                setSuccessMessage(`Attendance marked successfully for ${result.attendee.name}!`);
                
                // Reset after success
                setTimeout(() => {
                    setSuccessMessage(null);
                    setLastScanned(null);
                }, 3000);
            } else {
                setCameraError(result.message || 'Failed to mark attendance');
                setDebug(`API error: ${JSON.stringify(result)}`);
                
                // Clear error after delay
                setTimeout(() => {
                    setCameraError(null);
                    setLastScanned(null);
                }, 3000);
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            setCameraError(`Error connecting to server: ${error instanceof Error ? error.message : String(error)}`);
            setDebug(`Fetch error: ${error instanceof Error ? error.message : String(error)}`);
            
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
        // If we don't have a scanner instance, try to initialize it first
        if (!scannerRef.current && initializationAttempts.current < 3) {
            if (initializeScanner()) {
                setDebug("Scanner initialized on demand before starting");
            } else {
                setDebug("Failed to initialize scanner on demand");
                return;
            }
        }
        
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
            setDebug(`Switched to camera: ${availableCameras[nextIndex].label}`);
        }
    };

    const toggleDebug = () => {
        setShowDebug(!showDebug);
    };

    const reinitializeCamera = () => {
        setDebug("Manual reinitialize requested");
        
        // Stop scanning if active
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
        }
        
        // Reset state
        setScanning(false);
        setCameraError(null);
        
        // Reinitialize scanner and request permissions again
        if (initializeScanner()) {
            requestCameraPermission();
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
                        onChange={() => setType('in')}
                    /> Check In
                </label>
                <label>
                    <input
                        type="radio"
                        value="out"
                        checked={type === 'out'}
                        onChange={() => setType('out')}
                    /> Check Out
                </label>
            </div>
            
            <div style={{ marginTop: '10px', marginBottom: '10px', display: 'flex', gap: '10px' }}>
                <button onClick={toggleDebug} 
                    style={{ 
                        padding: '5px 10px', 
                        background: '#f0f0f0', 
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        flex: 1
                    }}>
                    {showDebug ? 'Hide Diagnostics' : 'Show Diagnostics'}
                </button>
                
                <button onClick={reinitializeCamera}
                    style={{ 
                        padding: '5px 10px', 
                        background: '#e6f7ff', 
                        border: '1px solid #91d5ff',
                        borderRadius: '4px',
                        flex: 1
                    }}>
                    Retry Camera
                </button>
            </div>
            
            {showDebug && (
                <div style={{ 
                    margin: '10px 0', 
                    padding: '10px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap'
                }}>
                    <p><strong>Status:</strong> {cameraPermission}</p>
                    <p><strong>Cameras Found:</strong> {availableCameras.length}</p>
                    <p><strong>Scanner Initialized:</strong> {scannerRef.current ? 'Yes' : 'No'}</p>
                    <p><strong>Init Attempts:</strong> {initializationAttempts.current}</p>
                    <p><strong>DOM Ready:</strong> {domReady ? 'Yes' : 'No'}</p>
                    <p><strong>Scanner Element:</strong> {document.getElementById('scanner-view') ? 'Found' : 'Not Found'}</p>
                    {availableCameras.length > 0 && (
                        <div>
                            <p><strong>Available Cameras:</strong></p>
                            <ul>
                                {availableCameras.map((camera, i) => (
                                    <li key={i}>{camera.label} {activeCameraId === camera.deviceId ? '(selected)' : ''}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p><strong>Debug Messages:</strong></p>
                    <p>{debug || 'No messages'}</p>
                    {cameraError && <p><strong>Error:</strong> {cameraError}</p>}
                </div>
            )}
            
            {cameraPermission === 'denied' && (
                <div className="camera-permission-denied" style={{ 
                    margin: '15px 0',
                    padding: '15px',
                    backgroundColor: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: '4px'
                }}>
                    <p>Camera access is required to scan QR codes.</p>
                    <p>Please enable camera access in your browser settings and reload this page.</p>
                </div>
            )}
            
            {cameraPermission === 'pending' && (
                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <p>Waiting for camera permission...</p>
                    <p>If prompted, please allow camera access</p>
                </div>
            )}
            
            {cameraPermission === 'granted' && (
                <>
                    <div className="scanner-controls" style={{ marginTop: '15px' }}>
                        {!scanning ? (
                            <button onClick={startScanning} className="scan-button" style={{
                                padding: '10px 20px',
                                backgroundColor: '#52c41a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                width: '100%'
                            }}>
                                Start Scanning
                            </button>
                        ) : (
                            <button onClick={stopScanning} className="scan-button stop" style={{
                                padding: '10px 20px',
                                backgroundColor: '#ff4d4f',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                width: '100%'
                            }}>
                                Stop Scanning
                            </button>
                        )}
                        
                        {availableCameras.length > 1 && (
                            <button onClick={switchCamera} className="switch-camera-button" style={{
                                marginTop: '10px',
                                padding: '8px 16px',
                                backgroundColor: '#1890ff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                width: '100%'
                            }}>
                                Switch Camera
                            </button>
                        )}
                    </div>
                    
                    <div id="scanner-view" ref={scannerDivRef} className="scanner-view" 
                        style={{ 
                            width: '100%', 
                            height: '300px', 
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#f0f0f0',
                            marginBottom: '15px',
                            marginTop: '15px',
                            position: 'relative'
                        }}>
                    </div>
                    
                    {cameraError && (
                        <div className="error-message" style={{
                            padding: '10px',
                            backgroundColor: '#fff2f0',
                            border: '1px solid #ffccc7',
                            borderRadius: '4px',
                            marginBottom: '15px',
                            color: '#cf1322'
                        }}>
                            {cameraError}
                        </div>
                    )}
                    
                    {successMessage && (
                        <div className="success-message" style={{
                            padding: '10px',
                            backgroundColor: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            borderRadius: '4px',
                            marginBottom: '15px',
                            color: '#52c41a'
                        }}>
                            {successMessage}
                        </div>
                    )}
                    
                    <p className="scanner-help-text" style={{ textAlign: 'center', margin: '15px 0' }}>
                        {scanning 
                            ? `Position the QR code in the center of the camera view to mark ${type === 'in' ? 'arrival' : 'departure'}`
                            : 'Press Start Scanning to begin'}
                    </p>
                </>
            )}
            
            <button onClick={() => navigate('/dashboard')} className="back-button" style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                width: '100%'
            }}>
                Back to Dashboard
            </button>
        </div>
    );
};

export default MobileScanner;