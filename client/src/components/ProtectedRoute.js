import React from 'react';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, loginWithReddit } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mt-xl">
        <div className="card text-center">
          <h2 className="text-xl mb-md">Authentication Required</h2>
          <p className="mb-lg text-gray-600">
            You need to be logged in to access this page.
          </p>
          <button onClick={loginWithReddit} className="btn btn-primary">
            Login with Reddit
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;