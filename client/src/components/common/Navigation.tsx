import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth';

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const closeMenu = () => {
        setMobileMenuOpen(false);
    };

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    if (!user) return null;

    return (
        <nav className="main-navigation">
            <div className="nav-container">
                <div className="nav-logo">
                    <Link to="/dashboard">QR Attendance</Link>
                </div>

                <button 
                    className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`} 
                    onClick={toggleMobileMenu}
                    aria-label="Toggle navigation menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
                    <ul className="nav-links">
                        <li>
                            <Link 
                                to="/dashboard" 
                                className={isActive('/dashboard') ? 'active' : ''}
                                onClick={closeMenu}
                            >
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/scanner" 
                                className={isActive('/scanner') ? 'active' : ''}
                                onClick={closeMenu}
                            >
                                Scan QR
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/qr-generator" 
                                className={isActive('/qr-generator') ? 'active' : ''}
                                onClick={closeMenu}
                            >
                                Generate QR
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/add-user" 
                                className={isActive('/add-user') ? 'active' : ''}
                                onClick={closeMenu}
                            >
                                Add Student
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/import" 
                                className={isActive('/import') ? 'active' : ''}
                                onClick={closeMenu}
                            >
                                Import Data
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/attendance" 
                                className={isActive('/attendance') ? 'active' : ''}
                                onClick={closeMenu}
                            >
                                View Records
                            </Link>
                        </li>
                    </ul>
                    
                    <div className="user-menu">
                        <span className="username">{user.username}</span>
                        <button onClick={handleLogout} className="logout-button">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation; 