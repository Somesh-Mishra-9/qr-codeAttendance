import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/auth';
import Login from './components/Auth/Login';
import PrivateRoute from './components/Auth/PrivateRoute';
import Dashboard from './components/Admin/Dashboard';
import QRScanner from './components/Admin/QRScanner';
import ImportCSV from './components/Admin/ImportCSV';
import AttendanceLog from './components/Admin/AttendanceLog';
import WebcamScanner from './components/Scanner/WebcamScanner';
import MobileScanner from './components/Scanner/MobileScanner';
import ScannerSelector from './components/Scanner/ScannerSelector';
import Navigation from './components/common/Navigation';
import NotFound from './components/common/NotFound';
import AddUser from './components/Admin/AddUser';
import StudentManagement from './components/Admin/StudentManagement';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="app-container">
                    <Navigation />
                    <main className="content-container">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />
                            
                            {/* Protected Scanner Routes */}
                            <Route path="/scanner" element={
                                <PrivateRoute>
                                    <ScannerSelector />
                                </PrivateRoute>
                            } />
                            <Route path="/scan/webcam" element={
                                <PrivateRoute>
                                    <WebcamScanner />
                                </PrivateRoute>
                            } />
                            <Route path="/scan/mobile" element={
                                <PrivateRoute>
                                    <MobileScanner />
                                </PrivateRoute>
                            } />
                            
                            {/* Protected Admin Routes */}
                            <Route path="/dashboard" element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            } />
                            <Route path="/qr-generator" element={
                                <PrivateRoute>
                                    <QRScanner />
                                </PrivateRoute>
                            } />
                            <Route path="/import" element={
                                <PrivateRoute>
                                    <ImportCSV />
                                </PrivateRoute>
                            } />
                            <Route path="/attendance" element={
                                <PrivateRoute>
                                    <AttendanceLog />
                                </PrivateRoute>
                            } />
                            <Route path="/add-user" element={
                                <PrivateRoute>
                                    <AddUser />
                                </PrivateRoute>
                            } />
                            <Route path="/student-management" element={
                                <PrivateRoute>
                                    <StudentManagement />
                                </PrivateRoute>
                            } />
                            {/* Default redirect */}
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            
                            {/* Not Found - 404 */}
                            <Route path="*" element={
                                <PrivateRoute>
                                    <NotFound />
                                </PrivateRoute>
                            } />
                        </Routes>
                    </main>
                    <footer className="app-footer">
                        <p>&copy; {new Date().getFullYear()} Crafted with ❤️ by MIT ITWG</p>
                    </footer>
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;