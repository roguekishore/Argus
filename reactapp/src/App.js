/**
 * App.js - Application Root Component
 * 
 * ARCHITECTURE:
 * - UserProvider wraps entire app for global user state
 * - ThemeProvider handles dark/light mode
 * - AuthInitializer restores session from storage
 * - AppRouter handles all role-based routing
 * 
 * AUTH FLOW:
 * 1. App mounts → UserProvider initializes with empty state
 * 2. AuthInitializer checks localStorage for stored user
 * 3. If found, populates UserContext (session restored)
 * 4. AppRouter renders appropriate view based on auth state
 */

import React from 'react';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './components/theme-provider';
import { AuthInitializer } from './components/auth/AuthInitializer';
import AppRouter from './router/AppRouter';

/**
 * Main App Component
 */
function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="grievance-theme">
      <UserProvider>
        <AuthInitializer>
          <AppRouter />
        </AuthInitializer>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
