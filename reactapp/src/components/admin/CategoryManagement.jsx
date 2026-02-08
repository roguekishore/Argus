/**
 * CategoryManagement Component
 * 
 * CRUD operations for complaint categories
 * - View all categories
 * - Create new categories
 * - Edit existing categories
 * - Delete categories
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
  Textarea
} from '../ui';
import { PageHeader } from '../common';
import { categoriesService } from '../../services';
import {
  FolderTree,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  X,
  Save,
  Search,
  Tag,
  FileText
} from 'lucide-react';

const CategoryManagement = () => {
  // State
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await categoriesService.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter categories
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = 
      cat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.keywords?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', description: '', keywords: '' });
    setSelectedCategory(null);
    setError(null);
  };

  // Handle create category
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await categoriesService.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        keywords: formData.keywords.trim()
      });
      
      setShowCreateModal(false);
      resetForm();
      await fetchCategories();
    } catch (err) {
      console.error('Failed to create category:', err);
      setError(err.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update category
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedCategory || !formData.name.trim()) {
      setError('Category name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await categoriesService.update(selectedCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        keywords: formData.keywords.trim()
      });
      
      setShowEditModal(false);
      resetForm();
      await fetchCategories();
    } catch (err) {
      console.error('Failed to update category:', err);
      setError(err.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete category
  const handleDelete = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return;
    }
    
    setError(null);
    try {
      await categoriesService.delete(categoryId);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err.message || 'Failed to delete category. It may be in use by existing complaints.');
    }
  };

  // Open edit modal
  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      keywords: category.keywords || ''
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        description="Manage complaint categories that help route complaints to appropriate departments"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCategories}
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
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        }
      />

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
              placeholder="Search categories by name, description, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Categories ({filteredCategories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No categories found matching your search.' : 'No categories found. Create one to get started.'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredCategories.map(category => (
                <div key={category.id} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderTree className="h-4 w-4 text-primary" />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mb-2 flex items-start gap-2">
                          <FileText className="h-3 w-3 mt-1 shrink-0" />
                          {category.description}
                        </p>
                      )}
                      {category.keywords && (
                        <div className="flex items-start gap-2">
                          <Tag className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {category.keywords.split(',').map((keyword, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-muted rounded-full"
                              >
                                {keyword.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="ml-1 sm:hidden">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.id, category.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 sm:hidden">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Category
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="create-name">Category Name *</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Road Maintenance"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-description">Description</Label>
                  <Textarea
                    id="create-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of what this category covers..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="create-keywords">Keywords (comma-separated)</Label>
                  <Textarea
                    id="create-keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="pothole, road damage, asphalt, pavement..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Keywords help the AI classify complaints to this category
                  </p>
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
                        Create Category
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Edit Category
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Category Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Road Maintenance"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of what this category covers..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-keywords">Keywords (comma-separated)</Label>
                  <Textarea
                    id="edit-keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="pothole, road damage, asphalt, pavement..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Keywords help the AI classify complaints to this category
                  </p>
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

export default CategoryManagement;
