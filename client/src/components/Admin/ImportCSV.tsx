import React, { useState, useRef } from 'react';
import { useAuth } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import Papa from 'papaparse';
import { apiUrl } from '../../config/config';

interface ImportResponse {
    count: number;
}

interface CSVRow {
    'Receipt No': string;
    'Full Name': string;
    'Email Id': string;
    'Mobile No': string;
    'TicketType': string;
    'Quantity': string;
    'qrcodeNumber': string;
    'University Registration No': string;
    'Branch': string;
    'Signup Date': string;
    'Attendee Id': string;
    [key: string]: string;
}

interface ParsedData {
    data: CSVRow[];
    errors: Papa.ParseError[];
    meta: Papa.ParseMeta;
}

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

const ImportCSV: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<CSVRow[]>([]);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { token } = useAuth();

    const requiredColumns = [
        'Full Name',
        'qrcodeNumber',
        'University Registration No',
        'Branch'
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            
            // Check file type
            if (!selectedFile.name.endsWith('.csv')) {
                setErrorMessage('Please upload a CSV file');
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }
            
            setFile(selectedFile);
            setErrorMessage('');
            setSuccessMessage('');
            setStatus('validating');
            
            // Parse and preview
            Papa.parse<CSVRow>(selectedFile as any, {
                header: true,
                skipEmptyLines: true,
                preview: 5, // Only preview first 5 rows
                complete: (results: ParsedData) => {
                    validateAndPreviewCSV(results);
                },
                error: (error: Error) => {
                    setErrorMessage(`Error parsing CSV: ${error.message}`);
                    setStatus('error');
                }
            });
        }
    };

    const validateAndPreviewCSV = (results: ParsedData) => {
        if (results.errors.length > 0) {
            setErrorMessage(`Parse errors: ${results.errors.map(e => e.message).join(', ')}`);
            setStatus('error');
            return;
        }

        // Check for required columns
        const headers = Object.keys(results.data[0] || {});
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            setErrorMessage(`Missing required columns: ${missingColumns.join(', ')}`);
            setStatus('error');
            return;
        }
        
        setPreviewData(results.data);
        setStatus('idle');
    };

    const uploadFile = async () => {
        if (!file) return;
        
        setStatus('uploading');
        setProgress(0);
        setErrorMessage('');
        setSuccessMessage('');
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = prev + 5;
                    return newProgress < 90 ? newProgress : prev;
                });
            }, 200);
            
            const response = await fetch(`${apiUrl}/attendance/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            clearInterval(progressInterval);
            
            if (response.ok) {
                const result = await response.json();
                setProgress(100);
                setStatus('success');
                setSuccessMessage(`Successfully imported ${result.count} attendees`);
                
                // Clear form after success
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setFile(null);
                setPreviewData([]);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to import CSV');
            }
        } catch (error) {
            setProgress(0);
            setStatus('error');
            setErrorMessage(`Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const resetForm = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setFile(null);
        setPreviewData([]);
        setErrorMessage('');
        setSuccessMessage('');
        setStatus('idle');
        setProgress(0);
    };

    if (status === 'uploading' && progress < 100) {
        return <LoadingSpinner />;
    }

    return (
        <div className="import-container">
            <h2>Import Attendance Data</h2>
            <div className="import-form">
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}
                
                <form onSubmit={uploadFile}>
                    <div className="file-input-container">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="file-input"
                            id="csv-file"
                        />
                        <label htmlFor="csv-file" className="file-label">
                            {file ? file.name : 'Choose CSV file'}
                        </label>
                    </div>

                    <div className="import-instructions">
                        <h3>CSV Format Requirements:</h3>
                        <ul>
                            <li>Required columns:</li>
                            <ul>
                                <li>Receipt No</li>
                                <li>Full Name</li>
                                <li>Email Id</li>
                                <li>Mobile No</li>
                                <li>qrcodeNumber</li>
                                <li>University Registration No</li>
                                <li>Branch</li>
                            </ul>
                            <li>File must be in CSV format</li>
                            <li>Maximum file size: 5MB</li>
                        </ul>
                    </div>

                    <div className="upload-section">
                        {status === 'uploading' && (
                            <div className="progress-bar-container">
                                <div 
                                    className="progress-bar" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                                <span className="progress-text">{progress}%</span>
                            </div>
                        )}
                        
                        <div className="action-buttons">
                            <button 
                                type="submit" 
                                className="submit-button"
                                disabled={!file || status === 'uploading' || status === 'error'}
                            >
                                Import Data
                            </button>
                            <button 
                                type="reset" 
                                className="reset-button"
                                onClick={resetForm}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            
            {previewData.length > 0 && (
                <div className="preview-section">
                    <h3>Preview (First {previewData.length} rows)</h3>
                    <div className="table-container">
                        <table className="preview-table">
                            <thead>
                                <tr>
                                    {Object.keys(previewData[0]).map(header => (
                                        <th key={header}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, index) => (
                                    <tr key={index}>
                                        {Object.values(row).map((value, i) => (
                                            <td key={i}>{value}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <button 
                type="button" 
                className="back-button"
                onClick={() => navigate('/dashboard')}
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default ImportCSV;