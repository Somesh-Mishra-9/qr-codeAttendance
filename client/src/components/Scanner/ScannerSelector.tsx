import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../services/auth';

const ScannerSelector: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="scanner-selector">
            <h2>Select Scanning Method</h2>
            
            <div className="scanner-options">
                <Link to="/scan/webcam" className="scanner-option">
                    <h3>Webcam Scanner</h3>
                    <p>Use your computer's webcam to scan QR codes</p>
                </Link>

                <Link to="/scan/mobile" className="scanner-option">
                    <h3>Mobile Scanner</h3>
                    <p>Use your mobile device's camera to scan QR codes</p>
                </Link>
            </div>

            {user?.role === 'admin' && (
                <Link to="/dashboard" className="back-button">
                    Back to Dashboard
                </Link>
            )}
        </div>
    );
};

export default ScannerSelector;