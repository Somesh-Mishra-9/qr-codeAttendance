import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../config/config';
import { generateRandomString } from '../../utils/helpers';

interface NewUser {
    fullName: string;
    universityRegNo: string;
    branch: string;
    email: string;
    mobileNo: string;
    qrcodeNumber: string;
}

const initialFormState: NewUser = {
    fullName: '',
    universityRegNo: '',
    branch: '',
    email: '',
    mobileNo: '',
    qrcodeNumber: ''
};

const AddUser: React.FC = () => {
    const [formData, setFormData] = useState<NewUser>(initialFormState);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const generateQRCode = () => {
        // Generate a random QR code number - in a real application, ensure it's unique
        const qrcodeNumber = generateRandomString(12);
        setFormData(prev => ({
            ...prev,
            qrcodeNumber
        }));
    };

    const validateForm = (): boolean => {
        if (!formData.fullName || !formData.universityRegNo || !formData.branch || !formData.qrcodeNumber) {
            setErrorMessage('Please fill in all required fields (Name, Registration No, Branch, QR Code)');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // First, check if a student with this registration number already exists
            const checkResponse = await fetch(`${apiUrl}/attendance/attendees`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (checkResponse.ok) {
                const attendees = await checkResponse.json();
                const existingStudent = attendees.find(
                    (student: any) => student.universityRegNo === formData.universityRegNo
                );
                
                if (existingStudent) {
                    // If student exists, confirm the QR code update
                    if (window.confirm(
                        `A student with this registration number already exists. Do you want to update only their QR code and keep other details?`
                    )) {
                        // Update only the QR code
                        const updateResponse = await fetch(`${apiUrl}/attendance/attendee/${existingStudent._id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                fullName: existingStudent.fullName,
                                universityRegNo: existingStudent.universityRegNo,
                                branch: existingStudent.branch,
                                email: existingStudent.email || '',
                                mobileNo: existingStudent.mobileNo || '',
                                qrcodeNumber: formData.qrcodeNumber
                            })
                        });
                        
                        const updateData = await updateResponse.json();
                        if (updateResponse.ok) {
                            setSuccessMessage('QR code updated for existing student successfully!');
                            setFormData(initialFormState);
                        } else {
                            setErrorMessage(updateData.message || 'Failed to update QR code');
                        }
                        setIsLoading(false);
                        return;
                    } else {
                        setErrorMessage('Operation cancelled. No changes were made.');
                        setIsLoading(false);
                        return;
                    }
                }
            }
            
            // If no existing student or user decided not to update, create new student
            const response = await fetch(`${apiUrl}/attendance/attendee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (response.ok) {
                setSuccessMessage(data.message || 'Student added successfully!');
                setFormData(initialFormState);
            } else {
                setErrorMessage(data.message || 'Failed to add student');
            }
        } catch (error) {
            setErrorMessage('Error connecting to server');
            console.error('Error adding student:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="add-user-container">
            <h2>Add New Student</h2>
            
            {errorMessage && (
                <div className="error-message">
                    {errorMessage}
                </div>
            )}
            
            {successMessage && (
                <div className="success-message">
                    {successMessage}
                </div>
            )}
            
            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name <span className="required">*</span></label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            placeholder="Enter full name"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="universityRegNo">Registration Number <span className="required">*</span></label>
                        <input
                            type="text"
                            id="universityRegNo"
                            name="universityRegNo"
                            value={formData.universityRegNo}
                            onChange={handleInputChange}
                            placeholder="Enter university registration number"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="branch">Branch/Department <span className="required">*</span></label>
                        <input
                            type="text"
                            id="branch"
                            name="branch"
                            value={formData.branch}
                            onChange={handleInputChange}
                            placeholder="Enter branch or department"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="mobileNo">Mobile Number</label>
                        <input
                            type="tel"
                            id="mobileNo"
                            name="mobileNo"
                            value={formData.mobileNo}
                            onChange={handleInputChange}
                            placeholder="Enter mobile number"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="qrcodeNumber">QR Code Number <span className="required">*</span></label>
                        <div className="qr-code-input-group">
                            <input
                                type="text"
                                id="qrcodeNumber"
                                name="qrcodeNumber"
                                value={formData.qrcodeNumber}
                                onChange={handleInputChange}
                                placeholder="QR Code identifier"
                                required
                                readOnly
                            />
                            <button 
                                type="button" 
                                onClick={generateQRCode}
                                className="generate-button"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                    
                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Adding...' : 'Add Student'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => navigate('/dashboard')}
                            className="cancel-button"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUser; 