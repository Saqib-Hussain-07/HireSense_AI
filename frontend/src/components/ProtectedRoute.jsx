import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser();
  const { user: localUser, loading: localLoading } = useAuth();

  if (!clerkLoaded || localLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-muted font-mono text-sm">
        loading session…
      </div>
    );
  }

  const isAuthed = clerkSignedIn || !!localUser;
  if (!isAuthed && (clerkLoaded || !localLoading)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
