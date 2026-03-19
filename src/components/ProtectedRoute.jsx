import React from 'react';
import { Navigate } from 'react-router-dom';  
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { role } = useAuth();

  if (!role) return <Navigate to="/" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;

  return children;
}
