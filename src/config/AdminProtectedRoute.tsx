// src/config/AdminProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, loading, isAdmin } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!currentUser || !isAdmin) {
        return <Navigate to="/adminlogin" replace />;
    }

    return children;
};

export default AdminProtectedRoute;