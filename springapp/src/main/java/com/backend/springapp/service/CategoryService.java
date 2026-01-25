package com.backend.springapp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.exception.DuplicateResourceException;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.Category;
import com.backend.springapp.repository.CategoryRepository;

@Service
@Transactional
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    /**
     * Create a new category (Admin only)
     */
    public Category createCategory(Category category) {
        if (categoryRepository.existsByName(category.getName())) {
            throw new DuplicateResourceException("Category already exists with name: " + category.getName());
        }
        return categoryRepository.save(category);
    }

    @Transactional(readOnly = true)
    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public Category getCategoryByName(String name) {
        return categoryRepository.findByName(name)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with name: " + name));
    }

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    /**
     * Update category (Admin only)
     */
    public Category updateCategory(Long id, Category updatedCategory) {
        Category existing = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        if (updatedCategory.getName() != null && !updatedCategory.getName().equals(existing.getName())) {
            if (categoryRepository.existsByName(updatedCategory.getName())) {
                throw new DuplicateResourceException("Category already exists with name: " + updatedCategory.getName());
            }
            existing.setName(updatedCategory.getName());
        }
        if (updatedCategory.getDescription() != null) {
            existing.setDescription(updatedCategory.getDescription());
        }
        if (updatedCategory.getKeywords() != null) {
            existing.setKeywords(updatedCategory.getKeywords());
        }

        return categoryRepository.save(existing);
    }

    /**
     * Delete category (Admin only)
     * Note: Should check if any complaints reference this category before deleting
     */
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found with id: " + id);
        }
        categoryRepository.deleteById(id);
    }
}
