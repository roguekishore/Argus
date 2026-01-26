/**
 * SLAManagement Component
 * 
 * CRUD operations for SLA configurations
 * - View all SLA configs
 * - Create new SLA configs
 * - Edit existing SLA configs
 * - Delete SLA configs
 * 
 * SLA links Category → Department with resolution time and priority
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
import { slaService, categoriesService, departmentsService } from '../../services';
import {
  Clock,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  X,
  Save,
  Search,
  Building,
  AlertTriangle,
  FolderTree,
  Timer
} from 'lucide-react';

// Priority configuration
const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const SLAManagement = () => {
  // State
  const [slaConfigs, setSlaConfigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSLA, setSelectedSLA] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    departmentId: '',
    slaDays: '',
    basePriority: 'MEDIUM'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [slaData, catData, deptData] = await Promise.all([
        slaService.getAll(),
        categoriesService.getAll(),
        departmentsService.getAll()
      ]);
      setSlaConfigs(Array.isArray(slaData) ? slaData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load SLA configurations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get categories without SLA (for create)
  const availableCategories = categories.filter(
    cat => !slaConfigs.some(sla => sla.category?.id === cat.id)
  );

  // Filter SLA configs
  const filteredSLAs = slaConfigs.filter(sla => {
    const categoryName = sla.category?.name || '';
    const departmentName = sla.department?.name || '';
    const matchesSearch = 
      categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      categoryId: '',
      departmentId: '',
      slaDays: '',
      basePriority: 'MEDIUM'
    });
    setSelectedSLA(null);
    setError(null);
  };

  // Handle create SLA
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.departmentId || !formData.slaDays) {
      setError('All fields are required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await slaService.create(
        {
          slaDays: parseInt(formData.slaDays),
          basePriority: formData.basePriority
        },
        formData.categoryId,
        formData.departmentId
      );
      
      setShowCreateModal(false);
      resetForm();
      await fetchData();
    } catch (err) {
      console.error('Failed to create SLA:', err);
      setError(err.message || 'Failed to create SLA configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update SLA
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedSLA || !formData.slaDays) {
      setError('SLA days is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      // Update SLA config
      await slaService.update(selectedSLA.id, {
        slaDays: parseInt(formData.slaDays),
        basePriority: formData.basePriority
      });

      // If department changed, update separately
      if (formData.departmentId && formData.departmentId !== selectedSLA.department?.id?.toString()) {
        await slaService.updateDepartment(selectedSLA.id, formData.departmentId);
      }
      
      setShowEditModal(false);
      resetForm();
      await fetchData();
    } catch (err) {
      console.error('Failed to update SLA:', err);
      setError(err.message || 'Failed to update SLA configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete SLA
  const handleDelete = async (slaId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete the SLA configuration for "${categoryName}"?`)) {
      return;
    }
    
    setError(null);
    try {
      await slaService.delete(slaId);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete SLA:', err);
      setError(err.message || 'Failed to delete SLA configuration');
    }
  };

  // Open edit modal
  const openEditModal = (sla) => {
    setSelectedSLA(sla);
    setFormData({
      categoryId: sla.category?.id?.toString() || '',
      departmentId: sla.department?.id?.toString() || '',
      slaDays: sla.slaDays?.toString() || '',
      basePriority: sla.basePriority || 'MEDIUM'
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SLA Configuration"
        description="Configure Service Level Agreements that define resolution times and priorities for each category"
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
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              disabled={availableCategories.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add SLA
            </Button>
          </div>
        }
      />

      {/* Info banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <span className="font-medium">SLA Configuration</span>
        </div>
        <p className="text-sm mt-1">
          Each category must have an SLA config that defines the resolution deadline and assigns it to a department.
          Complaints exceeding SLA days will trigger escalation.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by category or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* SLA List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Configurations ({filteredSLAs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSLAs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No SLA configurations found matching your search.' : 'No SLA configurations found. Create one to get started.'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredSLAs.map(sla => (
                <div key={sla.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderTree className="h-4 w-4 text-primary" />
                        <span className="font-medium">{sla.category?.name || 'Unknown Category'}</span>
                        <Badge className={PRIORITY_CONFIG[sla.basePriority]?.color || 'bg-gray-100'}>
                          {PRIORITY_CONFIG[sla.basePriority]?.label || sla.basePriority}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {sla.department?.name || 'Unknown Department'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {sla.slaDays} days to resolve
                        </span>
                        {sla.slaDays <= 2 && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            Urgent SLA
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(sla)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sla.id, sla.category?.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories without SLA warning */}
      {availableCategories.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Categories Without SLA</span>
          </div>
          <p className="text-sm mt-1">
            The following categories don't have SLA configurations: {' '}
            {availableCategories.map(cat => cat.name).join(', ')}
          </p>
        </div>
      )}

      {/* Create SLA Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create SLA Configuration
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="create-category">Category *</Label>
                  <select
                    id="create-category"
                    className="w-full h-10 px-3 border rounded-md bg-background mt-1"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="create-department">Department *</Label>
                  <select
                    id="create-department"
                    className="w-full h-10 px-3 border rounded-md bg-background mt-1"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
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
                <div>
                  <Label htmlFor="create-sla-days">SLA Days *</Label>
                  <Input
                    id="create-sla-days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.slaDays}
                    onChange={(e) => setFormData({ ...formData, slaDays: e.target.value })}
                    placeholder="Number of days to resolve"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Complaints not resolved within this time will be escalated
                  </p>
                </div>
                <div>
                  <Label htmlFor="create-priority">Base Priority *</Label>
                  <select
                    id="create-priority"
                    className="w-full h-10 px-3 border rounded-md bg-background mt-1"
                    value={formData.basePriority}
                    onChange={(e) => setFormData({ ...formData, basePriority: e.target.value })}
                    required
                  >
                    {PRIORITIES.map(priority => (
                      <option key={priority} value={priority}>
                        {PRIORITY_CONFIG[priority]?.label || priority}
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
                        Create SLA
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit SLA Modal */}
      {showEditModal && selectedSLA && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Edit SLA Configuration
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded">
                    {selectedSLA.category?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Category cannot be changed. Delete and create a new SLA if needed.
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit-department">Department *</Label>
                  <select
                    id="edit-department"
                    className="w-full h-10 px-3 border rounded-md bg-background mt-1"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
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
                <div>
                  <Label htmlFor="edit-sla-days">SLA Days *</Label>
                  <Input
                    id="edit-sla-days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.slaDays}
                    onChange={(e) => setFormData({ ...formData, slaDays: e.target.value })}
                    placeholder="Number of days to resolve"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-priority">Base Priority *</Label>
                  <select
                    id="edit-priority"
                    className="w-full h-10 px-3 border rounded-md bg-background mt-1"
                    value={formData.basePriority}
                    onChange={(e) => setFormData({ ...formData, basePriority: e.target.value })}
                    required
                  >
                    {PRIORITIES.map(priority => (
                      <option key={priority} value={priority}>
                        {PRIORITY_CONFIG[priority]?.label || priority}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SLAManagement;
