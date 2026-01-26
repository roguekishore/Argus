/**
 * UserManagement Component
 * 
 * CRUD operations for users in the admin dashboard
 * - View all users
 * - Create new staff users
 * - Assign department heads
 * - Delete users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Label,
  Badge
} from '../ui';
import { PageHeader } from '../common';
import { usersService, departmentsService } from '../../services';
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Crown,
  UserPlus,
  X,
  Search,
  Building,
  Phone,
  Mail,
  Shield
} from 'lucide-react';

// User types for display
const USER_TYPE_CONFIG = {
  CITIZEN: { label: 'Citizen', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  STAFF: { label: 'Staff', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  DEPT_HEAD: { label: 'Dept Head', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  MUNICIPAL_COMMISSIONER: { label: 'Commissioner', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const UserManagement = () => {
  // State
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUserType, setFilterUserType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignHeadModal, setShowAssignHeadModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    deptId: ''
  });
  const [assignDeptId, setAssignDeptId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, deptsData] = await Promise.all([
        usersService.getAll(),
        departmentsService.getAll()
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile?.includes(searchQuery);
    const matchesType = !filterUserType || user.userType === filterUserType;
    const matchesDept = !filterDepartment || user.deptId?.toString() === filterDepartment;
    return matchesSearch && matchesType && matchesDept;
  });

  // Handle create staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!formData.deptId) {
      setError('Please select a department');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await usersService.createStaff({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile
      }, formData.deptId);
      
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', mobile: '', deptId: '' });
      await fetchData();
    } catch (err) {
      console.error('Failed to create staff:', err);
      setError(err.message || 'Failed to create staff user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle assign department head
  const handleAssignHead = async () => {
    if (!selectedUser || !assignDeptId) {
      setError('Please select a department');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await usersService.assignDepartmentHead(selectedUser.userId, assignDeptId);
      setShowAssignHeadModal(false);
      setSelectedUser(null);
      setAssignDeptId('');
      await fetchData();
    } catch (err) {
      console.error('Failed to assign department head:', err);
      setError(err.message || 'Failed to assign department head');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setError(null);
    try {
      await usersService.delete(userId);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err.message || 'Failed to delete user');
    }
  };

  // Get department name
  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'N/A';
  };

  // Open assign head modal
  const openAssignHeadModal = (user) => {
    setSelectedUser(user);
    setAssignDeptId(user.deptId?.toString() || '');
    setShowAssignHeadModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users, create staff accounts, and assign department heads"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              className="h-10 px-3 border rounded-md bg-background min-w-[150px]"
              value={filterUserType}
              onChange={(e) => setFilterUserType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="CITIZEN">Citizen</option>
              <option value="STAFF">Staff</option>
              <option value="DEPT_HEAD">Dept Head</option>
              <option value="ADMIN">Admin</option>
              <option value="MUNICIPAL_COMMISSIONER">Commissioner</option>
            </select>
            <select
              className="h-10 px-3 border rounded-md bg-background min-w-[150px]"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.filter(d => d.name !== 'ADMIN').map(dept => (
                <option key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria.
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map(user => (
                <div key={user.userId} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{user.name}</span>
                      <Badge className={USER_TYPE_CONFIG[user.userType]?.color || 'bg-gray-100'}>
                        {USER_TYPE_CONFIG[user.userType]?.label || user.userType}
                      </Badge>
                      {user.userType === 'DEPT_HEAD' && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {user.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.mobile}
                      </span>
                      {user.deptId && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {getDepartmentName(user.deptId)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.userType === 'STAFF' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignHeadModal(user)}
                        title="Assign as Department Head"
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                    )}
                    {!['ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COMMISSIONER'].includes(user.userType) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.userId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create Staff User
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-digit mobile number"
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <select
                    id="department"
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={formData.deptId}
                    onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.filter(d => d.name !== 'ADMIN').map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Staff
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assign Department Head Modal */}
      {showAssignHeadModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Assign as Department Head
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAssignHeadModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Staff Member</p>
                <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
              </div>
              <div>
                <Label htmlFor="assignDept">Assign to Department *</Label>
                <select
                  id="assignDept"
                  className="w-full h-10 px-3 border rounded-md bg-background mt-1"
                  value={assignDeptId}
                  onChange={(e) => setAssignDeptId(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.filter(d => d.name !== 'ADMIN').map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                <Shield className="h-4 w-4 inline mr-2" />
                This will promote the staff member to Department Head role.
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignHeadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignHead}
                  disabled={isSubmitting || !assignDeptId}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Assign Head
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
