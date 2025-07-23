import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, logout, loginWithReddit, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { path: '/', label: 'Home', mobileLabel: 'Home' },
    { path: '/picks', label: 'Make Picks', mobileLabel: 'Picks', requiresAuth: true },
    { path: '/leaderboard', label: 'Leaderboard', mobileLabel: 'Leaderboard' }
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center py-3 md:py-5 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 no-underline">
            <span className="text-2xl md:text-3xl">🏈</span>
            <div className="text-xl md:text-3xl font-black drop-shadow-lg" style={{ color: '#FFFFFF' }}>
              Broncos Pickems
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div 
            className="items-center space-x-1"
            style={{ 
              display: window.innerWidth >= 768 ? 'flex' : 'none' 
            }}
          >
            {navLinks.map(link => {
              if (link.requiresAuth && !isAuthenticated) return null;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-2 lg:px-4 py-2 lg:py-3 font-bold text-sm lg:text-base no-underline transition-all duration-300 whitespace-nowrap ${
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
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 font-bold no-underline transition-all duration-200 hover:bg-white/10 rounded-lg"
                  style={{ color: '#FFFFFF', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
                >
                  {user?.username}
                  <svg className={`w-4 h-4 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-4 py-3 text-gray-800 hover:bg-orange-50 transition-colors no-underline"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </div>
                    </Link>
                    <hr className="border-gray-200" />
                    <button
                      onClick={() => {
                        logout();
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-gray-800 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </div>
                    </button>
                  </div>
                )}
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
            className="p-4 rounded-lg transition-all duration-300"
            style={{ 
              display: window.innerWidth < 768 ? 'block' : 'none',
              color: '#FB4D00',
              backgroundColor: 'rgba(251, 77, 0, 0.15)',
              border: '3px solid #FB4D00',
              borderRadius: '10px',
              minWidth: '48px',
              minHeight: '48px'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(251, 77, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(251, 77, 0, 0.15)';
            }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
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
          <div className="md:hidden pb-4 pt-3 px-2 border-t-4" style={{ borderTopColor: '#FA4616' }}>
            <div className="flex flex-col gap-2">
              {navLinks.map(link => {
                if (link.requiresAuth && !isAuthenticated) return null;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`mx-1 px-3 py-3 font-bold text-base text-white no-underline transition-all duration-300 whitespace-nowrap ${
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
                    {link.mobileLabel ? link.mobileLabel : link.label}
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