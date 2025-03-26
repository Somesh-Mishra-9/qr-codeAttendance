import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../config/config';

interface Attendance {
    _id: string;
    attendeeId: {
        _id: string;
        fullName: string;
        universityRegNo: string;
        branch: string;
    };
    date: string;
    type: 'in' | 'out';
    createdAt: string;
}

const AttendanceLog: React.FC = () => {
    const navigate = useNavigate();
    const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');

    useEffect(() => {
        fetchAttendanceRecords();
    }, []);

    const fetchAttendanceRecords = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/attendance/history`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAttendanceRecords(data);
            }
        } catch (error) {
            console.error('Error fetching attendance records:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getAttendanceTypeLabel = (type: 'in' | 'out') => {
        return type === 'in' ? 'Check In' : 'Check Out';
    };

    // Filter records based on search, date range and type
    const filteredRecords = attendanceRecords.filter(record => {
        // Search filter
        const matchesSearch = 
            record.attendeeId.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.attendeeId.universityRegNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.attendeeId.branch.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Date range filter
        const recordDate = new Date(record.date);
        const isAfterStartDate = startDate ? recordDate >= new Date(startDate) : true;
        const isBeforeEndDate = endDate ? recordDate <= new Date(endDate + 'T23:59:59') : true;
        
        // Type filter
        const matchesType = filterType === 'all' || record.type === filterType;
        
        return matchesSearch && isAfterStartDate && isBeforeEndDate && matchesType;
    });

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
        setFilterType('all');
    };

    const exportToCSV = () => {
        // Create CSV content
        const headers = ['Name', 'Registration No', 'Branch', 'Date', 'Type'];
        const csvRows = [headers.join(',')];
        
        filteredRecords.forEach(record => {
            const row = [
                `"${record.attendeeId.fullName}"`,
                `"${record.attendeeId.universityRegNo}"`,
                `"${record.attendeeId.branch}"`,
                `"${formatDate(record.date)}"`,
                `"${getAttendanceTypeLabel(record.type)}"`
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="attendance-log-container">
            <h2>Attendance Records</h2>
            
            <div className="filters-container">
                <div className="search-filter">
                    <input
                        type="text"
                        placeholder="Search by name, reg no, or branch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="date-filters">
                    <div className="date-filter">
                        <label>From:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    
                    <div className="date-filter">
                        <label>To:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="type-filter">
                    <label>Type:</label>
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'in' | 'out')}
                    >
                        <option value="all">All</option>
                        <option value="in">Check In</option>
                        <option value="out">Check Out</option>
                    </select>
                </div>
                
                <button onClick={resetFilters} className="reset-button">
                    Reset Filters
                </button>
                
                <button onClick={exportToCSV} className="export-button">
                    Export to CSV
                </button>
            </div>
            
            {isLoading ? (
                <p>Loading attendance records...</p>
            ) : filteredRecords.length === 0 ? (
                <p>No attendance records found</p>
            ) : (
                <div className="attendance-table-container">
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Registration No</th>
                                <th>Branch</th>
                                <th>Date & Time</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(record => (
                                <tr key={record._id}>
                                    <td>{record.attendeeId.fullName}</td>
                                    <td>{record.attendeeId.universityRegNo}</td>
                                    <td>{record.attendeeId.branch}</td>
                                    <td>{formatDate(record.date)}</td>
                                    <td className={`attendance-type ${record.type}`}>
                                        {getAttendanceTypeLabel(record.type)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <button onClick={() => navigate('/dashboard')} className="back-button">
                Back to Dashboard
            </button>
        </div>
    );
};

export default AttendanceLog;