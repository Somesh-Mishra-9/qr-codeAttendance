import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../config/config';

interface Attendee {
    _id: string;
    fullName: string;
    universityRegNo: string;
    branch: string;
    qrcodeNumber: string;
    email?: string;
    mobileNo?: string;
}

interface AttendanceRecord {
    _id: string;
    attendeeId: string | Attendee;
    date: string;
    type: 'in' | 'out';
}

const StudentManagement: React.FC = () => {
    const navigate = useNavigate();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        universityRegNo: '',
        branch: '',
        qrcodeNumber: '',
        email: '',
        mobileNo: ''
    });

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
            } else {
                showMessage('Failed to load students', 'error');
            }
        } catch (error) {
            console.error('Error fetching attendees:', error);
            showMessage('Error connecting to server', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAttendeeDetails = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/attendance/attendee/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAttendanceRecords(data.attendanceRecords);
                setSelectedAttendee(data.attendee);
                
                // Initialize form data for editing
                setFormData({
                    fullName: data.attendee.fullName || '',
                    universityRegNo: data.attendee.universityRegNo || '',
                    branch: data.attendee.branch || '',
                    qrcodeNumber: data.attendee.qrcodeNumber || '',
                    email: data.attendee.email || '',
                    mobileNo: data.attendee.mobileNo || ''
                });
            } else {
                showMessage('Failed to load student details', 'error');
            }
        } catch (error) {
            console.error('Error fetching attendee details:', error);
            showMessage('Error connecting to server', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteAttendee = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this student? This will also delete all attendance records.')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/attendance/attendee/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                showMessage('Student deleted successfully', 'success');
                setAttendees(attendees.filter(a => a._id !== id));
                setSelectedAttendee(null);
                setAttendanceRecords([]);
            } else {
                showMessage('Failed to delete student', 'error');
            }
        } catch (error) {
            console.error('Error deleting attendee:', error);
            showMessage('Error connecting to server', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteAttendanceRecord = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/attendance/record/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                showMessage('Attendance record deleted successfully', 'success');
                setAttendanceRecords(attendanceRecords.filter(r => r._id !== id));
            } else {
                showMessage('Failed to delete attendance record', 'error');
            }
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            showMessage('Error connecting to server', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const updateAttendee = async () => {
        if (!selectedAttendee) return;
        
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/attendance/attendee/${selectedAttendee._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const updatedAttendee = await response.json();
                showMessage('Student updated successfully', 'success');
                
                // Update the attendees list
                setAttendees(attendees.map(a => 
                    a._id === selectedAttendee._id ? { ...a, ...formData } : a
                ));
                
                // Update the selected attendee
                setSelectedAttendee({ ...selectedAttendee, ...formData });
                
                // Exit edit mode
                setIsEditing(false);
            } else {
                const error = await response.json();
                showMessage(error.message || 'Failed to update student', 'error');
            }
        } catch (error) {
            console.error('Error updating attendee:', error);
            showMessage('Error connecting to server', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const filteredAttendees = attendees.filter(
        attendee => 
            attendee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            attendee.universityRegNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            attendee.branch.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            padding: '15px',
            boxSizing: 'border-box'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: 'calc(1.2rem + 1vw)' }}>
                Student Management
            </h2>
            
            {message && (
                <div style={{
                    padding: '10px',
                    backgroundColor: message.type === 'success' ? '#f6ffed' : '#fff2f0',
                    border: `1px solid ${message.type === 'success' ? '#b7eb8f' : '#ffccc7'}`,
                    borderRadius: '4px',
                    marginBottom: '15px',
                    color: message.type === 'success' ? '#52c41a' : '#cf1322',
                    textAlign: 'center',
                    fontSize: 'calc(0.8rem + 0.3vw)'
                }}>
                    {message.text}
                </div>
            )}
            
            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth > 768 ? 'row' : 'column',
                gap: '20px'
            }}>
                {/* Students List */}
                <div style={{ 
                    flex: '1', 
                    maxHeight: window.innerWidth > 768 ? '600px' : '300px', 
                    overflowY: 'auto',
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '8px'
                }}>
                    <h3 style={{ marginTop: '0', fontSize: 'calc(1rem + 0.5vw)' }}>Students</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <input
                            type="text"
                            placeholder="Search by name, ID or branch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '8px',
                                width: '100%',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    
                    {isLoading && !selectedAttendee ? (
                        <p style={{ textAlign: 'center' }}>Loading students...</p>
                    ) : filteredAttendees.length === 0 ? (
                        <p style={{ textAlign: 'center' }}>No students found</p>
                    ) : (
                        <div>
                            {filteredAttendees.map(attendee => (
                                <div 
                                    key={attendee._id}
                                    onClick={() => fetchAttendeeDetails(attendee._id)}
                                    style={{
                                        margin: '10px 0',
                                        padding: '10px',
                                        backgroundColor: selectedAttendee?._id === attendee._id ? '#e6f7ff' : '#f9f9f9',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        border: '1px solid #d9d9d9'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: 'calc(0.9rem + 0.2vw)' }}>
                                        {attendee.fullName}
                                    </div>
                                    <div style={{ fontSize: 'calc(0.7rem + 0.2vw)', color: '#666' }}>
                                        {attendee.universityRegNo} - {attendee.branch}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Student Details */}
                <div style={{ 
                    flex: '1',
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '8px'
                }}>
                    {isLoading && selectedAttendee ? (
                        <p style={{ textAlign: 'center' }}>Loading details...</p>
                    ) : selectedAttendee ? (
                        <>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ margin: '0', fontSize: 'calc(1rem + 0.5vw)' }}>Student Details</h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {isEditing ? (
                                        <>
                                            <button 
                                                onClick={updateAttendee}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#52c41a',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Save
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    // Reset form data to original values
                                                    if (selectedAttendee) {
                                                        setFormData({
                                                            fullName: selectedAttendee.fullName || '',
                                                            universityRegNo: selectedAttendee.universityRegNo || '',
                                                            branch: selectedAttendee.branch || '',
                                                            qrcodeNumber: selectedAttendee.qrcodeNumber || '',
                                                            email: selectedAttendee.email || '',
                                                            mobileNo: selectedAttendee.mobileNo || ''
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#333',
                                                    border: '1px solid #d9d9d9',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#1890ff',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => deleteAttendee(selectedAttendee._id)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#ff4d4f',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {isEditing ? (
                                <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                                            Registration Number
                                        </label>
                                        <input
                                            type="text"
                                            name="universityRegNo"
                                            value={formData.universityRegNo}
                                            onChange={handleInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                                            Branch
                                        </label>
                                        <input
                                            type="text"
                                            name="branch"
                                            value={formData.branch}
                                            onChange={handleInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                                            QR Code Number
                                        </label>
                                        <input
                                            type="text"
                                            name="qrcodeNumber"
                                            value={formData.qrcodeNumber}
                                            onChange={handleInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                                            Mobile Number
                                        </label>
                                        <input
                                            type="text"
                                            name="mobileNo"
                                            value={formData.mobileNo}
                                            onChange={handleInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '15px'
                                    }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '14px', color: '#666' }}>Full Name</div>
                                            <div style={{ fontSize: '16px' }}>{selectedAttendee.fullName}</div>
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '14px', color: '#666' }}>Registration Number</div>
                                            <div style={{ fontSize: '16px' }}>{selectedAttendee.universityRegNo}</div>
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '14px', color: '#666' }}>Branch</div>
                                            <div style={{ fontSize: '16px' }}>{selectedAttendee.branch}</div>
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '14px', color: '#666' }}>QR Code Number</div>
                                            <div style={{ fontSize: '16px' }}>{selectedAttendee.qrcodeNumber}</div>
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '14px', color: '#666' }}>Email</div>
                                            <div style={{ fontSize: '16px' }}>{selectedAttendee.email || '-'}</div>
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '14px', color: '#666' }}>Mobile Number</div>
                                            <div style={{ fontSize: '16px' }}>{selectedAttendee.mobileNo || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div style={{ marginTop: '30px' }}>
                                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', fontSize: 'calc(0.9rem + 0.3vw)' }}>
                                    Attendance Records
                                </h4>
                                
                                {attendanceRecords.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666' }}>No attendance records found</p>
                                ) : (
                                    <div style={{ 
                                        maxHeight: '300px', 
                                        overflowY: 'auto',
                                        border: '1px solid #f0f0f0',
                                        borderRadius: '4px'
                                    }}>
                                        <table style={{ 
                                            width: '100%', 
                                            borderCollapse: 'collapse',
                                            fontSize: 'calc(0.7rem + 0.2vw)'
                                        }}>
                                            <thead>
                                                <tr style={{ 
                                                    backgroundColor: '#fafafa', 
                                                    textAlign: 'left' 
                                                }}>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>Date & Time</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>Type</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', width: '60px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attendanceRecords.map(record => (
                                                    <tr key={record._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                        <td style={{ padding: '8px' }}>{formatDate(record.date)}</td>
                                                        <td style={{ padding: '8px' }}>
                                                            <span style={{
                                                                padding: '3px 8px',
                                                                borderRadius: '10px',
                                                                fontSize: '12px',
                                                                backgroundColor: record.type === 'in' ? '#f6ffed' : '#fff2f0',
                                                                color: record.type === 'in' ? '#52c41a' : '#ff4d4f',
                                                                border: `1px solid ${record.type === 'in' ? '#b7eb8f' : '#ffccc7'}`
                                                            }}>
                                                                {record.type === 'in' ? 'Check In' : 'Check Out'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteAttendanceRecord(record._id);
                                                                }}
                                                                style={{
                                                                    padding: '3px 8px',
                                                                    backgroundColor: 'transparent',
                                                                    color: '#ff4d4f',
                                                                    border: '1px solid #ff4d4f',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#666' }}>Select a student to view details</p>
                    )}
                </div>
            </div>
            
            <button 
                onClick={() => navigate('/dashboard')} 
                style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: 'calc(0.8rem + 0.3vw)',
                    cursor: 'pointer',
                    display: 'block',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '20px auto 0'
                }}
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default StudentManagement; 