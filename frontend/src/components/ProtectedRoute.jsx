import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react';

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-zinc-400 font-mono text-sm">
        loading session…
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

