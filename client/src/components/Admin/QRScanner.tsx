import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { apiUrl } from '../../config/config';

interface Attendee {
    _id: string;
    fullName: string;
    universityRegNo: string;
    branch: string;
    qrcodeNumber: string;
}

const QRScanner: React.FC = () => {
    const navigate = useNavigate();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAttendees();
    }, []);

    const fetchAttendees = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/attendance/attendees`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAttendees(data);
            }
        } catch (error) {
            console.error('Error fetching attendees:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAttendees = attendees.filter(
        attendee => 
            attendee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            attendee.universityRegNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const downloadQRCode = () => {
        if (!selectedAttendee) return;
        
        const canvas = document.getElementById('qrcode-canvas') as HTMLCanvasElement;
        if (!canvas) return;
        
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR_${selectedAttendee.universityRegNo}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const printQRCode = () => {
        if (!selectedAttendee) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const canvas = document.getElementById('qrcode-canvas') as HTMLCanvasElement;
        if (!canvas) return;
        
        const url = canvas.toDataURL('image/png');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR Code - ${selectedAttendee.fullName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; }
                        .container { max-width: 400px; margin: 0 auto; padding: 20px; }
                        img { max-width: 100%; height: auto; }
                        h2 { margin-bottom: 5px; }
                        p { margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>${selectedAttendee.fullName}</h2>
                        <p>${selectedAttendee.universityRegNo} - ${selectedAttendee.branch}</p>
                        <img src="${url}" alt="QR Code" />
                        <p>QR Code ID: ${selectedAttendee.qrcodeNumber}</p>
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        
        printWindow.document.close();
    };

    return (
        <div className="qr-generator-container">
            <h2>QR Code Generator</h2>
            
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search by name or reg number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>
            
            <div className="qr-content">
                <div className="attendee-list">
                    <h3>Select Student</h3>
                    {isLoading ? (
                        <p>Loading attendees...</p>
                    ) : filteredAttendees.length === 0 ? (
                        <p>No attendees found</p>
                    ) : (
                        <div className="list-container">
                            {filteredAttendees.map(attendee => (
                                <div 
                                    key={attendee._id}
                                    className={`attendee-item ${selectedAttendee?._id === attendee._id ? 'selected' : ''}`}
                                    onClick={() => setSelectedAttendee(attendee)}
                                >
                                    <div className="attendee-name">{attendee.fullName}</div>
                                    <div className="attendee-detail">
                                        {attendee.universityRegNo} - {attendee.branch}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="qr-display">
                    <h3>QR Code</h3>
                    {selectedAttendee ? (
                        <div className="qr-code-container">
                            <QRCode 
                                id="qrcode-canvas"
                                value={selectedAttendee.qrcodeNumber}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                            <div className="attendee-details">
                                <h4>{selectedAttendee.fullName}</h4>
                                <p>{selectedAttendee.universityRegNo}</p>
                                <p>{selectedAttendee.branch}</p>
                            </div>
                            <div className="qr-actions">
                                <button onClick={downloadQRCode} className="action-button">
                                    Download
                                </button>
                                <button onClick={printQRCode} className="action-button">
                                    Print
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p>Select a student to generate QR code</p>
                    )}
                </div>
            </div>
            
            <button onClick={() => navigate('/dashboard')} className="back-button">
                Back to Dashboard
            </button>
        </div>
    );
};

export default QRScanner;