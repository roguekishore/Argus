/**
 * AuthInitializer - Restores auth session on app startup
 * 
 * This component MUST be inside UserProvider to access context.
 * It reads stored user data from localStorage and populates UserContext.
 * 
 * FLOW:
 * 1. Component mounts inside UserProvider
 * 2. Reads user from localStorage via useAuth hook
 * 3. If user found, populates UserContext
 * 4. Renders children only after initialization
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const AuthInitializer = ({ children }) => {
  const { initializeAuth } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Restore session from localStorage
    // This populates UserContext if user was previously logged in
    initializeAuth();
    setIsInitialized(true);
  }, [initializeAuth]);

  // Show loading spinner while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
};

export default AuthInitializer;
