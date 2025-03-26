import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { apiUrl } from '../../config/config';

interface TodayAttendanceDetail {
    _id: 'in' | 'out';
    count: number;
    students: Array<{
        name: string;
        regNo: string;
        branch: string;
        time: string;
    }>;
}

interface DashboardStats {
    totalUsers: number;
    todayAttendance: number;
    totalAttendance: number;
    branchStats: Array<{
        _id: string;
        count: number;
    }>;
    todayDetails: TodayAttendanceDetail[];
}

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${apiUrl}/stats`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchStats();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <h1>Admin Dashboard</h1>
                <div className="user-info">
                    <span>Welcome, {user?.username}</span>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-stats">
                {stats && (
                    <>
                        <div className="stat-card">
                            <h3>Total Students</h3>
                            <p>{stats.totalUsers}</p>
                        </div>
                        <div className="stat-card">
                            <h3>Today's Attendance</h3>
                            <p>{stats.todayAttendance}</p>
                        </div>
                        <div className="stat-card">
                            <h3>Total Attendance Records</h3>
                            <p>{stats.totalAttendance}</p>
                        </div>
                    </>
                )}
            </div>

            {stats?.branchStats && (
                <div className="branch-stats">
                    <h2>Branch-wise Students</h2>
                    <div className="branch-stats-grid">
                        {stats.branchStats.map(branch => (
                            <div key={branch._id} className="stat-card">
                                <h3>{branch._id || 'Unspecified'}</h3>
                                <p>{branch.count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stats?.todayDetails && (
                <div className="today-attendance">
                    <h2>Today's Attendance Details</h2>
                    <div className="today-attendance-grid">
                        <div className="attendance-type-card">
                            <h3>Check-ins</h3>
                            <div className="attendance-list">
                                {stats.todayDetails
                                    .find(d => d._id === 'in')?.students
                                    .map((student, idx) => (
                                        <div key={idx} className="attendance-entry">
                                            <span className="student-name">{student.name}</span>
                                            <span className="student-details">
                                                {student.regNo} ({student.branch})
                                            </span>
                                            <span className="attendance-time">
                                                {new Date(student.time).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )) || <p>No check-ins yet</p>
                                }
                            </div>
                        </div>
                        
                        <div className="attendance-type-card">
                            <h3>Check-outs</h3>
                            <div className="attendance-list">
                                {stats.todayDetails
                                    .find(d => d._id === 'out')?.students
                                    .map((student, idx) => (
                                        <div key={idx} className="attendance-entry">
                                            <span className="student-name">{student.name}</span>
                                            <span className="student-details">
                                                {student.regNo} ({student.branch})
                                            </span>
                                            <span className="attendance-time">
                                                {new Date(student.time).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )) || <p>No check-outs yet</p>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-actions">
                <Link to="/scanner" className="action-card">
                    <h3>Scan QR Code</h3>
                    <p>Mark attendance using QR code</p>
                </Link>
                <Link to="/add-user" className="action-card">
                    <h3>Add Student</h3>
                    <p>Add a new student to the system</p>
                </Link>
                <Link to="/import" className="action-card">
                    <h3>Import Data</h3>
                    <p>Import attendance data from CSV</p>
                </Link>
                <Link to="/attendance" className="action-card">
                    <h3>View Logs</h3>
                    <p>View attendance records</p>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;