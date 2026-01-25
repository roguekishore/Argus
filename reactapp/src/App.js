import { useState } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { 
  CitizenDashboard,
  StaffDashboard,
  SupervisorDashboard,
  DepartmentHeadDashboard,
  AdminDashboard,
  SuperAdminDashboard 
} from './pages/dashboards';
// import ChatBot from './ChatBot';

function App() {
  const [currentPage, setCurrentPage] = useState('citizen-dashboard'); // Change this to test different dashboards

  // Auth pages
  if (currentPage === 'login') {
    return <Login onSwitchToSignup={() => setCurrentPage('signup')} />;
  }
  if (currentPage === 'signup') {
    return <Signup onSwitchToLogin={() => setCurrentPage('login')} />;
  }

  // Dashboard pages - change 'citizen-dashboard' to test others:
  // 'citizen-dashboard', 'staff-dashboard', 'supervisor-dashboard', 
  // 'dept-head-dashboard', 'admin-dashboard', 'super-admin-dashboard'
  
  const dashboards = {
    'citizen-dashboard': <CitizenDashboard />,
    'staff-dashboard': <StaffDashboard />,
    'supervisor-dashboard': <SupervisorDashboard />,
    'dept-head-dashboard': <DepartmentHeadDashboard />,
    'admin-dashboard': <AdminDashboard />,
    'super-admin-dashboard': <SuperAdminDashboard />,
  };

  return dashboards[currentPage] || <CitizenDashboard />;
}

export default App;
