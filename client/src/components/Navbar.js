import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, logout, loginWithReddit, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/picks', label: 'Make Picks', requiresAuth: true },
    { path: '/leaderboard', label: 'Leaderboard' }
  ];

  return (
    <nav style={{ backgroundColor: 'var(--broncos-blue)' }} className="shadow-lg">
      <div className="container">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-md">
            <div 
              className="text-2xl font-bold text-white"
              style={{ color: 'var(--broncos-orange)' }}
            >
              🏈 Broncos Pickems
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-lg">
            {navLinks.map(link => {
              if (link.requiresAuth && !isAuthenticated) return null;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isActive(link.path)
                      ? 'text-white bg-orange-600'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                  style={isActive(link.path) ? { backgroundColor: 'var(--broncos-orange)' } : {}}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-md">
            {isAuthenticated ? (
              <div className="flex items-center gap-md">
                <Link
                  to="/profile"
                  className="flex items-center gap-sm text-white hover:text-gray-300"
                >
                  {user?.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span>{user?.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="btn btn-outline text-white border-gray-300 hover:bg-white hover:text-gray-800"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithReddit}
                className="btn btn-primary"
              >
                Login with Reddit
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-sm">
              {navLinks.map(link => {
                if (link.requiresAuth && !isAuthenticated) return null;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      isActive(link.path)
                        ? 'text-white bg-orange-600'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                    style={isActive(link.path) ? { backgroundColor: 'var(--broncos-orange)' } : {}}
                  >
                    {link.label}
                  </Link>
                );
              })}
              
              {/* Mobile auth */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-sm">
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-sm px-4 py-2 text-white hover:bg-gray-700 rounded-md"
                    >
                      {user?.avatar_url && (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span>{user?.username}</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="btn btn-outline text-white border-gray-300 hover:bg-white hover:text-gray-800 mx-4"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      loginWithReddit();
                      setIsMenuOpen(false);
                    }}
                    className="btn btn-primary mx-4"
                  >
                    Login with Reddit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;