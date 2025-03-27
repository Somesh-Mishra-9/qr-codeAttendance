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
    const [availableCameras, setAvailableCameras] = useState<{deviceId: string, label: string}[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [debug, setDebug] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(true);
    const [processingQr, setProcessingQr] = useState(false);
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const addDebugMessage = (message: string) => {
        console.log(message); // Log to console for additional debugging
        setDebug(prev => `${prev ? prev + '\n' : ''}${message}`);
    };

    // Initialize camera permissions first
    useEffect(() => {
        addDebugMessage("Component mounted, requesting camera permission...");
        
        const requestPermission = async () => {
            try {
                // Request camera access
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                
                // If successful, get available cameras
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices
                    .filter(device => device.kind === 'videoinput')
                    .map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || `Camera ${device.deviceId.slice(0, 5)}`
                    }));
                
                // Stop the stream we just opened
                stream.getTracks().forEach(track => track.stop());
                
                setAvailableCameras(cameras);
                setCameraPermission('granted');
                
                if (cameras.length > 0) {
                    // Default to back camera if available
                    const backCamera = cameras.find(camera => 
                        camera.label.toLowerCase().includes('back') || 
                        camera.label.toLowerCase().includes('rear'));
                    
                    const cameraId = backCamera?.deviceId || cameras[0].deviceId;
                    setSelectedCamera(cameraId);
                    addDebugMessage(`Found ${cameras.length} cameras. Selected: ${backCamera?.label || cameras[0].label}`);
                } else {
                    addDebugMessage('No cameras found on device');
                    setCameraError('No cameras found on your device');
                }
            } catch (error) {
                setCameraPermission('denied');
                const errorMsg = error instanceof Error ? error.message : String(error);
                setCameraError(`Camera access denied: ${errorMsg}`);
                addDebugMessage(`Camera permission error: ${errorMsg}`);
            }
        };
        
        requestPermission();
        
        // Cleanup function
        return () => {
            cleanupScanner();
            
            // Clear any pending timeouts
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }
        };
    }, []);

    const cleanupScanner = () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => {});
                }
                // Clear HTML5QrCode (exists in v2.x)
                if (typeof scannerRef.current.clear === 'function') {
                    scannerRef.current.clear();
                }
            } catch (error) {
                // Ignore cleanup errors
                console.error('Error cleaning up scanner:', error);
            }
            scannerRef.current = null;
        }
    };

    const createScanner = () => {
        try {
            // Clean up any existing scanner
            cleanupScanner();
            
            // Create container if it doesn't exist
            if (!document.getElementById('scanner-view')) {
                addDebugMessage("Scanner container not found, can't initialize scanner");
                return false;
            }
            
            // Create new scanner
            scannerRef.current = new Html5Qrcode('scanner-view');
            addDebugMessage("Scanner created successfully");
            return true;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            addDebugMessage(`Failed to create scanner: ${errorMsg}`);
            setCameraError(`Scanner initialization failed: ${errorMsg}`);
            return false;
        }
    };

    const startScanning = () => {
        if (cameraPermission !== 'granted' || !selectedCamera) {
            addDebugMessage("Cannot start scanner - no camera permission or no camera selected");
            return;
        }
        
        // Create scanner if it doesn't exist
        if (!scannerRef.current && !createScanner()) {
            return;
        }
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        setScanning(true);
        setCameraError(null);
        setSuccessMessage(null);
        setLastScanned(null); // Reset last scanned value when starting scan
        
        addDebugMessage(`Starting scanner with camera ID: ${selectedCamera}`);
        
        scannerRef.current!.start(
            { deviceId: { exact: selectedCamera } },
            config,
            handleQRCodeSuccess,
            handleQRCodeError
        ).catch(error => {
            setScanning(false);
            setCameraError(`Failed to start camera: ${error.message}`);
            addDebugMessage(`Start scanner error: ${error.message}`);
            
            // Try creating the scanner again
            setTimeout(() => {
                addDebugMessage("Retrying scanner creation...");
                createScanner();
            }, 1000);
        });
    };

    const stopScanning = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop()
                .then(() => {
                    addDebugMessage("Scanner stopped");
                    setScanning(false);
                })
                .catch(error => {
                    addDebugMessage(`Error stopping scanner: ${error.message}`);
                    setScanning(false);
                });
        } else {
            setScanning(false);
        }
    };

    const handleQRCodeSuccess = async (decodedText: string) => {
        // Return immediately if we're already processing a QR code
        // or if this is a duplicate of what we just scanned
        if (processingQr || lastScanned === decodedText) {
            return;
        }
        
        // Lock to prevent duplicate submissions
        setProcessingQr(true);
        setLastScanned(decodedText);
        addDebugMessage(`Scanned code: ${decodedText}`);
        
        try {
            // Stop scanning immediately to prevent duplicates
            if (scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.pause();
            }
            
            const url = `${apiUrl}/attendance/mark`;
            addDebugMessage(`Calling API: ${url}`);
            
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
                stopScanning();
                setSuccessMessage(`Attendance marked successfully for ${result.attendee.name}!`);
                
                // Reset after success
                scanTimeoutRef.current = setTimeout(() => {
                    setSuccessMessage(null);
                    setLastScanned(null);
                    setProcessingQr(false);
                }, 3000);
            } else {
                setCameraError(result.message || 'Failed to mark attendance');
                addDebugMessage(`API error: ${JSON.stringify(result)}`);
                
                // Clear error after delay
                scanTimeoutRef.current = setTimeout(() => {
                    setCameraError(null);
                    setLastScanned(null);
                    setProcessingQr(false);
                    // Resume scanning if needed
                    if (scannerRef.current && scanning) {
                        scannerRef.current.resume();
                    }
                }, 3000);
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Error marking attendance:', error);
            setCameraError(`Error connecting to server: ${errorMsg}`);
            addDebugMessage(`Fetch error: ${errorMsg}`);
            
            // Clear error after delay
            scanTimeoutRef.current = setTimeout(() => {
                setCameraError(null);
                setLastScanned(null);
                setProcessingQr(false);
                // Resume scanning if needed
                if (scannerRef.current && scanning) {
                    scannerRef.current.resume();
                }
            }, 3000);
        }
    };

    const handleQRCodeError = (error: string) => {
        // Ignore frequent scan errors
        console.debug('QR scan error:', error);
    };

    const switchCamera = () => {
        if (availableCameras.length <= 1) return;
        
        if (scanning) {
            stopScanning();
        }

        const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedCamera);
        const nextIndex = (currentIndex + 1) % availableCameras.length;
        setSelectedCamera(availableCameras[nextIndex].deviceId);
        addDebugMessage(`Switched to camera: ${availableCameras[nextIndex].label}`);
    };

    const toggleDebug = () => {
        setShowDebug(!showDebug);
    };

    const reinitializeCamera = () => {
        addDebugMessage("Manual reinitialize requested");
        
        // Stop scanning
        if (scanning) {
            stopScanning();
        }
        
        // Clean up scanner
        cleanupScanner();
        
        // Reset lock
        setProcessingQr(false);
        
        // Request permission again
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                // Stop the stream
                stream.getTracks().forEach(track => track.stop());
                
                // Create scanner
                if (createScanner()) {
                    addDebugMessage("Scanner reinitialized successfully");
                }
            })
            .catch(error => {
                const errorMsg = error instanceof Error ? error.message : String(error);
                addDebugMessage(`Failed to reinitialize: ${errorMsg}`);
                setCameraError(`Camera access failed: ${errorMsg}`);
            });
    };

    return (
        <div className="mobile-scanner-container" style={{ 
            maxWidth: '100%', 
            padding: '10px',
            boxSizing: 'border-box'
        }}>
            <h2 style={{ fontSize: 'calc(1.2rem + 1vw)', textAlign: 'center' }}>Mobile QR Scanner</h2>
            
            <div className="scanner-type-selector" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <label style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: 'calc(0.9rem + 0.5vw)'
                }}>
                    <input
                        type="radio"
                        value="in"
                        checked={type === 'in'}
                        onChange={() => setType('in')}
                        style={{ marginRight: '5px' }}
                    /> Check In
                </label>
                <label style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: 'calc(0.9rem + 0.5vw)',
                    marginLeft: '15px'
                }}>
                    <input
                        type="radio"
                        value="out"
                        checked={type === 'out'}
                        onChange={() => setType('out')}
                        style={{ marginRight: '5px' }}
                    /> Check Out
                </label>
            </div>
            
            <div style={{ 
                marginTop: '10px', 
                marginBottom: '10px', 
                display: 'flex', 
                gap: '10px',
                flexWrap: 'wrap'
            }}>
                <button onClick={toggleDebug} 
                    style={{ 
                        padding: '5px 10px', 
                        background: '#f0f0f0', 
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        flex: 1,
                        minWidth: '120px'
                    }}>
                    {showDebug ? 'Hide Diagnostics' : 'Show Diagnostics'}
                </button>
                
                <button onClick={reinitializeCamera}
                    style={{ 
                        padding: '5px 10px', 
                        background: '#e6f7ff', 
                        border: '1px solid #91d5ff',
                        borderRadius: '4px',
                        flex: 1,
                        minWidth: '120px'
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
                    whiteSpace: 'pre-wrap',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    wordBreak: 'break-word'
                }}>
                    <p><strong>Status:</strong> {cameraPermission}</p>
                    <p><strong>Cameras Found:</strong> {availableCameras.length}</p>
                    <p><strong>Scanner Created:</strong> {scannerRef.current ? 'Yes' : 'No'}</p>
                    <p><strong>Container Element:</strong> {document.getElementById('scanner-view') ? 'Found' : 'Not Found'}</p>
                    <p><strong>Is Scanning:</strong> {scannerRef.current?.isScanning ? 'Yes' : 'No'}</p>
                    <p><strong>Processing QR:</strong> {processingQr ? 'Yes' : 'No'}</p>
                    {availableCameras.length > 0 && (
                        <div>
                            <p><strong>Available Cameras:</strong></p>
                            <ul>
                                {availableCameras.map((camera, i) => (
                                    <li key={i}>{camera.label} {selectedCamera === camera.deviceId ? '(selected)' : ''}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p><strong>Debug Messages:</strong></p>
                    <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: '5px 0',
                        fontSize: '12px'
                    }}>
                        {debug || 'No messages'}
                    </pre>
                    {cameraError && <p><strong>Error:</strong> {cameraError}</p>}
                </div>
            )}
            
            {cameraPermission === 'denied' && (
                <div style={{ 
                    margin: '15px 0',
                    padding: '15px',
                    backgroundColor: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: '4px',
                    fontSize: 'calc(0.8rem + 0.5vw)'
                }}>
                    <p>Camera access is required to scan QR codes.</p>
                    <p>Please enable camera access in your browser settings and reload this page.</p>
                    <button 
                        onClick={reinitializeCamera}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        Request Camera Permission Again
                    </button>
                </div>
            )}
            
            {cameraPermission === 'pending' && (
                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 'calc(0.9rem + 0.5vw)' }}>Waiting for camera permission...</p>
                    <p style={{ fontSize: 'calc(0.8rem + 0.5vw)' }}>If prompted, please allow camera access</p>
                    <div style={{ marginTop: '15px', fontSize: '40px' }}>📷</div>
                </div>
            )}
            
            {cameraPermission === 'granted' && (
                <>
                    <div style={{ marginTop: '15px' }}>
                        {!scanning ? (
                            <button 
                                onClick={startScanning} 
                                disabled={processingQr}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: processingQr ? '#d9d9d9' : '#52c41a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: 'calc(0.9rem + 0.5vw)',
                                    cursor: processingQr ? 'not-allowed' : 'pointer',
                                    width: '100%'
                                }}
                            >
                                Start Scanning
                            </button>
                        ) : (
                            <button 
                                onClick={stopScanning}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#ff4d4f',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: 'calc(0.9rem + 0.5vw)',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                Stop Scanning
                            </button>
                        )}
                        
                        {availableCameras.length > 1 && (
                            <button onClick={switchCamera} style={{
                                marginTop: '10px',
                                padding: '8px 16px',
                                backgroundColor: '#1890ff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: 'calc(0.8rem + 0.4vw)',
                                cursor: 'pointer',
                                width: '100%'
                            }}>
                                Switch Camera
                            </button>
                        )}
                    </div>
                    
                    <div 
                        id="scanner-view" 
                        ref={containerRef}
                        style={{ 
                            width: '100%', 
                            height: '300px', 
                            maxHeight: '50vh',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#f0f0f0',
                            marginBottom: '15px',
                            marginTop: '15px',
                            position: 'relative'
                        }}
                    ></div>
                    
                    {cameraError && (
                        <div style={{
                            padding: '10px',
                            backgroundColor: '#fff2f0',
                            border: '1px solid #ffccc7',
                            borderRadius: '4px',
                            marginBottom: '15px',
                            color: '#cf1322',
                            fontSize: 'calc(0.8rem + 0.4vw)'
                        }}>
                            {cameraError}
                        </div>
                    )}
                    
                    {successMessage && (
                        <div style={{
                            padding: '10px',
                            backgroundColor: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            borderRadius: '4px',
                            marginBottom: '15px',
                            color: '#52c41a',
                            fontSize: 'calc(0.8rem + 0.4vw)',
                            textAlign: 'center'
                        }}>
                            {successMessage}
                        </div>
                    )}
                    
                    <p style={{ 
                        textAlign: 'center', 
                        margin: '15px 0',
                        fontSize: 'calc(0.8rem + 0.4vw)'
                    }}>
                        {scanning 
                            ? `Position the QR code in the center of the camera view to mark ${type === 'in' ? 'arrival' : 'departure'}`
                            : 'Press Start Scanning to begin'}
                    </p>
                </>
            )}
            
            <button onClick={() => navigate('/dashboard')} style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: 'calc(0.9rem + 0.5vw)',
                cursor: 'pointer',
                width: '100%'
            }}>
                Back to Dashboard
            </button>
        </div>
    );
};

export default MobileScanner;