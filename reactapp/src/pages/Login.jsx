import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Separator, Badge } from '../components/ui';
import { ThemeToggle } from '../components/theme-toggle';
import { ArgusLogo } from '../components/common';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, User, Shield, ShieldCheck, Landmark, Users, Wrench } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_DASHBOARD_ROUTES } from '../constants/roles';

// Predefined test users from DataInitializer
const TEST_USERS = [
  { 
    name: 'Citizen', 
    email: 'citizen@gmail.com', 
    role: 'CITIZEN',
    icon: User,
    description: 'File grievances',
    color: 'bg-blue-500'
  },
  { 
    name: 'Staff', 
    email: 'roads1@gmail.com', 
    role: 'STAFF',
    icon: Wrench,
    description: 'Handle complaints',
    color: 'bg-green-500'
  },
  { 
    name: 'Dept Head', 
    email: 'roadshead@gmail.com', 
    role: 'DEPT_HEAD',
    icon: Users,
    description: 'Manage department',
    color: 'bg-orange-500'
  },
  { 
    name: 'Admin', 
    email: 'admin@gmail.com', 
    role: 'ADMIN',
    icon: Shield,
    description: 'Route complaints',
    color: 'bg-purple-500'
  },
  { 
    name: 'Super Admin', 
    email: 'superadmin@gmail.com', 
    role: 'SUPER_ADMIN',
    icon: ShieldCheck,
    description: 'System management',
    color: 'bg-red-500'
  },
  { 
    name: 'Commissioner', 
    email: 'commissioner@gmail.com', 
    role: 'MUNICIPAL_COMMISSIONER',
    icon: Landmark,
    description: 'Oversight & escalations',
    color: 'bg-amber-600'
  },
];

const DEFAULT_PASSWORD = 'argusargus';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get redirect path from location state (if redirected from protected route)
  const from = location.state?.from || null;
  
  // Check for success message from signup redirect
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from history state to prevent re-showing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.message]);

  // Handle quick login - auto-fill credentials
  const handleQuickLogin = (user) => {
    setEmail(user.email);
    setPassword(DEFAULT_PASSWORD);
    clearError();
    setSuccessMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null); // Clear success message when submitting

    try {
      const userData = await login({ email, password });
      
      // Redirect to intended page or role-based dashboard
      const redirectTo = from || ROLE_DASHBOARD_ROUTES[userData.role] || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Error is handled by useAuth hook
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <ArgusLogo className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Quick Login Section for Testing */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {/* <span className="text-sm font-medium text-muted-foreground">Click to autofill</span> */}
              <Badge variant="secondary" className="text-xs mx-auto text-center">Click to autofill</Badge>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2">
              {TEST_USERS.map((user) => {
                const Icon = user.icon;
                return (
                  <Button
                    key={user.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 justify-start gap-2 hover:bg-accent"
                    onClick={() => handleQuickLogin(user)}
                    disabled={isLoading}
                  >
                    <div className={`h-6 w-6 rounded-full ${user.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-medium truncate">{user.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{user.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Password: <code className="bg-muted px-1 rounded">{DEFAULT_PASSWORD}</code>
            </p>
          </div>

          <Separator className="mb-6" />

          {/* Success Alert (e.g., from signup redirect) */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 mb-4 text-sm text-green-800 bg-green-100 rounded-lg dark:bg-green-900 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
