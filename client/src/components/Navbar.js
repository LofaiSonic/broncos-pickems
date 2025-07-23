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
    <nav 
      className="shadow-2xl"
      style={{
        background: `linear-gradient(135deg, #001489 0%, #002a9f 50%, #001489 100%)`,
        borderBottom: '4px solid #FA4616',
        borderTop: '2px solid rgba(255,255,255,0.2)'
      }}
    >
      <div className="container">
        <div className="flex justify-between items-center py-3 md:py-5 px-4 md:px-0">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 no-underline">
            <span className="text-2xl md:text-3xl">🏈</span>
            <div className="text-xl md:text-3xl font-black drop-shadow-lg" style={{ color: '#FFFFFF' }}>
              <span className="hidden sm:inline">Broncos Pickems</span>
              <span className="sm:hidden">Pickems</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map(link => {
              if (link.requiresAuth && !isAuthenticated) return null;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 lg:px-8 py-3 lg:py-4 font-bold text-base lg:text-lg no-underline transition-all duration-300 ${
                    isActive(link.path)
                      ? 'bg-gradient-to-b from-orange-400 to-orange-600 shadow-inner'
                      : 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-orange-500 hover:to-orange-700'
                  }`}
                  style={{
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    borderTop: '2px solid rgba(255,255,255,0.3)',
                    borderLeft: '2px solid rgba(255,255,255,0.3)',
                    borderBottom: '2px solid rgba(0,0,0,0.3)',
                    borderRight: '2px solid rgba(0,0,0,0.3)',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  className="px-4 py-2 font-bold no-underline transition-colors duration-200"
                  style={{ color: '#FFFFFF', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
                >
                  {user?.username}
                </Link>
                <button
                  onClick={logout}
                  className="px-4 lg:px-6 py-2 lg:py-3 font-bold text-sm lg:text-base transition-all duration-300 bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700"
                  style={{
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    borderTop: '2px solid rgba(255,255,255,0.3)',
                    borderLeft: '2px solid rgba(255,255,255,0.3)',
                    borderBottom: '2px solid rgba(0,0,0,0.3)',
                    borderRight: '2px solid rgba(0,0,0,0.3)',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithReddit}
                className="px-4 lg:px-8 py-3 lg:py-4 font-bold text-base lg:text-lg transition-all duration-300 bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700"
                style={{
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  borderTop: '2px solid rgba(255,255,255,0.3)',
                  borderLeft: '2px solid rgba(255,255,255,0.3)',
                  borderBottom: '2px solid rgba(0,0,0,0.3)',
                  borderRight: '2px solid rgba(0,0,0,0.3)',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                }}
              >
                Login with Reddit
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-3 text-white hover:bg-orange-600 rounded-lg transition-all duration-300"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.3)',
              borderLeft: '1px solid rgba(255,255,255,0.3)',
              borderBottom: '1px solid rgba(0,0,0,0.3)',
              borderRight: '1px solid rgba(0,0,0,0.3)'
            }}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-6 pt-4 px-4 border-t-4" style={{ borderTopColor: '#FA4616' }}>
            <div className="flex flex-col gap-2">
              {navLinks.map(link => {
                if (link.requiresAuth && !isAuthenticated) return null;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`mx-2 px-6 py-4 font-bold text-lg text-white no-underline transition-all duration-300 ${
                      isActive(link.path)
                        ? 'bg-gradient-to-b from-orange-400 to-orange-600 shadow-inner'
                        : 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-orange-500 hover:to-orange-700'
                    }`}
                    style={{
                      borderRadius: '8px',
                      borderTop: '2px solid rgba(255,255,255,0.3)',
                      borderLeft: '2px solid rgba(255,255,255,0.3)',
                      borderBottom: '2px solid rgba(0,0,0,0.3)',
                      borderRight: '2px solid rgba(0,0,0,0.3)',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
              
              {/* Mobile auth */}
              <div className="mt-6 pt-4 border-t-2" style={{ borderTopColor: '#FA4616' }}>
                {isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    <div className="px-4 py-2 font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                      {user?.username}
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="mx-4 px-6 py-3 font-bold text-white transition-all duration-300 bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700"
                      style={{
                        borderRadius: '8px',
                        borderTop: '2px solid rgba(255,255,255,0.3)',
                        borderLeft: '2px solid rgba(255,255,255,0.3)',
                        borderBottom: '2px solid rgba(0,0,0,0.3)',
                        borderRight: '2px solid rgba(0,0,0,0.3)',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                      }}
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
                    className="mx-4 w-full px-8 py-4 font-bold text-lg text-white transition-all duration-300 bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700"
                    style={{
                      borderRadius: '8px',
                      borderTop: '2px solid rgba(255,255,255,0.3)',
                      borderLeft: '2px solid rgba(255,255,255,0.3)',
                      borderBottom: '2px solid rgba(0,0,0,0.3)',
                      borderRight: '2px solid rgba(0,0,0,0.3)',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                    }}
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