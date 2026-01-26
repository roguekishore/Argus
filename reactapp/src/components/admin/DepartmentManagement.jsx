/**
 * DepartmentManagement Component
 * 
 * View departments and their staff/heads
 * - View all departments
 * - See department head and staff members
 * - Departments are read-only (seeded on startup)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge
} from '../ui';
import { PageHeader } from '../common';
import { departmentsService, usersService } from '../../services';
import {
  Building,
  Users,
  RefreshCw,
  Crown,
  User,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail
} from 'lucide-react';

const DepartmentManagement = () => {
  // State
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDept, setExpandedDept] = useState(null);
  const [deptDetails, setDeptDetails] = useState({}); // { deptId: { head, staff } }
  const [loadingDetails, setLoadingDetails] = useState({});

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await departmentsService.getAll();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Fetch department details (head and staff)
  const fetchDeptDetails = async (deptId) => {
    if (deptDetails[deptId]) return; // Already loaded
    
    setLoadingDetails(prev => ({ ...prev, [deptId]: true }));
    try {
      const [head, staff] = await Promise.all([
        usersService.getDepartmentHead(deptId).catch(() => null),
        usersService.getDepartmentStaff(deptId).catch(() => [])
      ]);
      setDeptDetails(prev => ({
        ...prev,
        [deptId]: {
          head: head || null,
          staff: Array.isArray(staff) ? staff : []
        }
      }));
    } catch (err) {
      console.error('Failed to fetch department details:', err);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [deptId]: false }));
    }
  };

  // Toggle department expansion
  const toggleDept = (deptId) => {
    if (expandedDept === deptId) {
      setExpandedDept(null);
    } else {
      setExpandedDept(deptId);
      fetchDeptDetails(deptId);
    }
  };

  // Get staff count for a department
  const getStaffCount = (deptId) => {
    const details = deptDetails[deptId];
    if (!details) return '...';
    return details.staff.length + (details.head ? 1 : 0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Management"
        description="View departments and their assigned staff members"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDepartments}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Info banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          <span className="font-medium">System Departments</span>
        </div>
        <p className="text-sm mt-1">
          Departments are pre-configured. Use User Management to assign staff to departments.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Departments List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : departments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No departments found.
            </CardContent>
          </Card>
        ) : (
          departments
            .filter(dept => dept.name !== 'ADMIN')
            .map(dept => (
              <Card key={dept.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleDept(dept.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedDept === dept.id ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Building className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {expandedDept === dept.id || deptDetails[dept.id] 
                        ? getStaffCount(dept.id) 
                        : '...'
                      } members
                    </Badge>
                  </div>
                </CardHeader>
                
                {expandedDept === dept.id && (
                  <CardContent className="border-t bg-muted/30">
                    {loadingDetails[dept.id] ? (
                      <div className="flex items-center justify-center py-6">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        {/* Department Head */}
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-500" />
                            Department Head
                          </h4>
                          {deptDetails[dept.id]?.head ? (
                            <div className="p-3 bg-background rounded-md border">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                  <Crown className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{deptDetails[dept.id].head.name}</p>
                                  <div className="flex gap-4 text-sm text-muted-foreground">
                                    {deptDetails[dept.id].head.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {deptDetails[dept.id].head.email}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {deptDetails[dept.id].head.mobile}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic p-3 bg-background rounded-md border border-dashed">
                              No department head assigned
                            </p>
                          )}
                        </div>

                        {/* Staff Members */}
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Staff Members ({deptDetails[dept.id]?.staff?.length || 0})
                          </h4>
                          {deptDetails[dept.id]?.staff?.length > 0 ? (
                            <div className="space-y-2">
                              {deptDetails[dept.id].staff.map(staff => (
                                <div key={staff.userId} className="p-3 bg-background rounded-md border flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{staff.name}</p>
                                    <div className="flex gap-4 text-xs text-muted-foreground">
                                      {staff.email && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {staff.email}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {staff.mobile}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic p-3 bg-background rounded-md border border-dashed">
                              No staff members assigned
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default DepartmentManagement;
