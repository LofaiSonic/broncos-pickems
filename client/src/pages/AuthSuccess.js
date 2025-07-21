import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      login(token);
      // Redirect to picks page after successful login
      setTimeout(() => {
        navigate('/picks');
      }, 2000);
    } else {
      // No token, redirect to home
      navigate('/');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="container mt-xl">
      <div className="card text-center">
        <div className="loading">
          <div className="spinner"></div>
        </div>
        <h2 className="text-xl mt-lg">Successfully logged in!</h2>
        <p className="text-gray-600 mt-sm">
          Redirecting you to make your picks...
        </p>
      </div>
    </div>
  );
};

export default AuthSuccess;