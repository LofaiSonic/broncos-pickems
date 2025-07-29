import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    console.log('AuthSuccess: Token received?', !!token);
    console.log('AuthSuccess: Current URL params:', Object.fromEntries(searchParams.entries()));
    
    if (token) {
      console.log('AuthSuccess: Calling login with token');
      login(token);
      // Redirect to picks page after successful login
      setTimeout(() => {
        console.log('AuthSuccess: Redirecting to picks page');
        navigate('/picks');
      }, 2000);
    } else {
      console.log('AuthSuccess: No token found, redirecting to home');
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