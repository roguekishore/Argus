package com.backend.springapp.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.dto.request.UserRequestDTO;
import com.backend.springapp.dto.response.UserResponseDTO;
import com.backend.springapp.enums.UserType;
import com.backend.springapp.exception.DuplicateResourceException;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.DepartmentRepository;
import com.backend.springapp.repository.UserRepository;

@Service
@Transactional
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private DepartmentRepository departmentRepository;
    
    /**
     * Create a new user
     */
    public UserResponseDTO createUser(UserRequestDTO request) {
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }
        if (userRepository.existsByMobile(request.getMobile())) {
            throw new DuplicateResourceException("Mobile number already exists");
        }
        
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setMobile(request.getMobile());
        user.setDeptId(request.getDeptId());
        if(request.getUserType() == null) {
            user.setUserType(UserType.CITIZEN);
        } else {
            user.setUserType(request.getUserType());
        }
        User savedUser = userRepository.save(user);
        return convertToResponseDTO(savedUser);
    }
    
    /**
     * Get user by ID
     */
    @Transactional(readOnly = true)
    public UserResponseDTO getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return convertToResponseDTO(user);
    }
    
    /**
     * Get all users
     */
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
            .map(this::convertToResponseDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Update user
     */
    public UserResponseDTO updateUser(Long id, UserRequestDTO request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        
        // Check email uniqueness if changed
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email already exists");
            }
        }
        
        // Check mobile uniqueness if changed
        if (!request.getMobile().equals(user.getMobile())) {
            if (userRepository.existsByMobile(request.getMobile())) {
                throw new DuplicateResourceException("Mobile number already exists");
            }
        }
        
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(request.getPassword()); // TODO: Encrypt password
        }
        user.setMobile(request.getMobile());
        user.setDeptId(request.getDeptId());
        user.setUserType(request.getUserType());
        
        User updatedUser = userRepository.save(user);
        return convertToResponseDTO(updatedUser);
    }
    
    /**
     * Delete user
     */
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }
    
    /**
     * Find user by email
     */
    @Transactional(readOnly = true)
    public UserResponseDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return convertToResponseDTO(user);
    }
    
    /**
     * Find user by mobile
     */
    @Transactional(readOnly = true)
    public UserResponseDTO getUserByMobile(String mobile) {
        User user = userRepository.findByMobile(mobile)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with mobile: " + mobile));
        return convertToResponseDTO(user);
    }
    
    /**
     * Convert User entity to UserResponseDTO
     */
    private UserResponseDTO convertToResponseDTO(User user) {
        return UserResponseDTO.builder()
            .userId(user.getUserId())
            .name(user.getName())
            .email(user.getEmail())
            .mobile(user.getMobile())
            .deptId(user.getDeptId())
            .userType(user.getUserType())
            .createdAt(user.getCreatedAt())
            .lastLogin(user.getLastLogin())
            .build();
    }

    // ==================== STAFF MANAGEMENT ====================

    /**
     * Create a staff member and assign to a department.
     * Called by Admin to add staff to a specific department.
     * 
     * @param request User details
     * @param deptId Department ID (1-6)
     * @return Created staff user
     */
    public UserResponseDTO createStaff(UserRequestDTO request, Long deptId) {
        // Validate department exists
        if (!departmentRepository.existsById(deptId)) {
            throw new ResourceNotFoundException("Department not found with id: " + deptId);
        }
        
        // Check for duplicates
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }
        if (userRepository.existsByMobile(request.getMobile())) {
            throw new DuplicateResourceException("Mobile number already exists");
        }
        
        User staff = new User();
        staff.setName(request.getName());
        staff.setEmail(request.getEmail());
        staff.setPassword(request.getPassword());
        staff.setMobile(request.getMobile());
        staff.setDeptId(deptId);
        staff.setUserType(UserType.STAFF);
        
        User savedStaff = userRepository.save(staff);
        return convertToResponseDTO(savedStaff);
    }

    /**
     * Assign a department head from existing staff.
     * The user must already be a STAFF member in that department.
     * If another DEPT_HEAD exists, they will be demoted to STAFF.
     * 
     * @param userId The staff user to promote
     * @param deptId The department ID
     * @return Updated user as DEPT_HEAD
     */
    public UserResponseDTO assignDepartmentHead(Long userId, Long deptId) {
        // Validate department exists
        if (!departmentRepository.existsById(deptId)) {
            throw new ResourceNotFoundException("Department not found with id: " + deptId);
        }
        
        // Find the user
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        // Verify user belongs to the specified department
        if (user.getDeptId() == null || !user.getDeptId().equals(deptId)) {
            throw new IllegalArgumentException("User does not belong to department: " + deptId);
        }
        
        // Verify user is currently a STAFF member
        if (user.getUserType() != UserType.STAFF) {
            throw new IllegalArgumentException("Only STAFF members can be promoted to DEPT_HEAD");
        }
        
        // Demote existing DEPT_HEAD if any
        List<User> existingHeads = userRepository.findByDeptIdAndUserType(deptId, UserType.DEPT_HEAD);
        for (User existingHead : existingHeads) {
            existingHead.setUserType(UserType.STAFF);
            userRepository.save(existingHead);
        }
        
        // Promote the new head
        user.setUserType(UserType.DEPT_HEAD);
        User savedUser = userRepository.save(user);
        
        return convertToResponseDTO(savedUser);
    }

    /**
     * Get all staff members of a department (includes STAFF and DEPT_HEAD)
     */
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getStaffByDepartment(Long deptId) {
        if (!departmentRepository.existsById(deptId)) {
            throw new ResourceNotFoundException("Department not found with id: " + deptId);
        }
        return userRepository.findByDeptId(deptId).stream()
            .filter(u -> u.getUserType() == UserType.STAFF || u.getUserType() == UserType.DEPT_HEAD)
            .map(this::convertToResponseDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get department head of a specific department
     */
    @Transactional(readOnly = true)
    public UserResponseDTO getDepartmentHead(Long deptId) {
        if (!departmentRepository.existsById(deptId)) {
            throw new ResourceNotFoundException("Department not found with id: " + deptId);
        }
        List<User> heads = userRepository.findByDeptIdAndUserType(deptId, UserType.DEPT_HEAD);
        if (heads.isEmpty()) {
            throw new ResourceNotFoundException("No department head assigned for department: " + deptId);
        }
        return convertToResponseDTO(heads.get(0));
    }
}
