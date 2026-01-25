package com.backend.springapp.security;

/**
 * Represents the current authenticated user's context.
 * 
 * DESIGN INTENT:
 * - This is a PURE data carrier - no HTTP dependencies
 * - All services receive this instead of HttpServletRequest or JWT tokens
 * - Easy to mock in tests
 * - When migrating to JWT/Spring Security, simply change how this is populated
 *   (from a SecurityContextHolder or JWT claims) without touching business logic
 * 
 * USAGE:
 * - Controllers create UserContext from request headers (mocked for now)
 * - Services receive UserContext as a method parameter
 * - NEVER inject UserContext as a bean - always pass explicitly for clarity
 * 
 * @param userId       The unique identifier of the user
 * @param role         The user's role for RBAC enforcement
 * @param departmentId The department ID (null for CITIZEN, SUPER_ADMIN, or SYSTEM)
 */
public record UserContext(
    Long userId,
    UserRole role,
    Long departmentId
) {
    
    /**
     * Compact constructor with validation.
     */
    public UserContext {
        if (userId == null && role != UserRole.SYSTEM) {
            throw new IllegalArgumentException("userId is required for non-SYSTEM users");
        }
        if (role == null) {
            throw new IllegalArgumentException("role is required");
        }
    }
    
    /**
     * Create a SYSTEM context for AI/automated processes.
     * Use this when the AI or scheduler triggers state transitions.
     */
    public static UserContext system() {
        return new UserContext(null, UserRole.SYSTEM, null);
    }
    
    /**
     * Create a CITIZEN context.
     * Citizens don't belong to any department.
     */
    public static UserContext citizen(Long userId) {
        return new UserContext(userId, UserRole.CITIZEN, null);
    }
    
    /**
     * Create a STAFF context.
     * Staff must belong to a department.
     */
    public static UserContext staff(Long userId, Long departmentId) {
        if (departmentId == null) {
            throw new IllegalArgumentException("Staff must belong to a department");
        }
        return new UserContext(userId, UserRole.STAFF, departmentId);
    }
    
    /**
     * Create a DEPT_HEAD context.
     * Department heads must belong to a department.
     */
    public static UserContext deptHead(Long userId, Long departmentId) {
        if (departmentId == null) {
            throw new IllegalArgumentException("Department Head must belong to a department");
        }
        return new UserContext(userId, UserRole.DEPT_HEAD, departmentId);
    }
    
    /**
     * Create a COMMISSIONER context.
     * Commissioner may optionally belong to a department.
     */
    public static UserContext commissioner(Long userId, Long departmentId) {
        return new UserContext(userId, UserRole.COMMISSIONER, departmentId);
    }
    
    /**
     * Create an ADMIN context.
     * Admins typically don't belong to a specific department.
     */
    public static UserContext admin(Long userId) {
        return new UserContext(userId, UserRole.ADMIN, null);
    }
    
    /**
     * Create a SUPER_ADMIN context.
     * Super admins have global access and don't belong to departments.
     */
    public static UserContext superAdmin(Long userId) {
        return new UserContext(userId, UserRole.SUPER_ADMIN, null);
    }
    
    /**
     * Check if user is the complaint owner.
     * Used for citizen-specific operations like closing their own complaint.
     */
    public boolean isComplaintOwner(Long citizenId) {
        return this.role == UserRole.CITIZEN && 
               this.userId != null && 
               this.userId.equals(citizenId);
    }
    
    /**
     * Check if user belongs to the same department as the complaint.
     * Used for staff/dept_head authorization checks.
     */
    public boolean isInDepartment(Long targetDepartmentId) {
        return this.departmentId != null && 
               this.departmentId.equals(targetDepartmentId);
    }
    
    /**
     * Create a string representation for logging/debugging.
     * IMPORTANT: Suitable for audit logs.
     */
    @Override
    public String toString() {
        return String.format("UserContext[userId=%d, role=%s, deptId=%s]", 
            userId, role, departmentId);
    }
}
