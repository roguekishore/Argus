package com.backend.springapp.security;

import com.backend.springapp.enums.UserType;

/**
 * Represents roles for RBAC enforcement in state transitions.
 * 
 * DESIGN NOTE:
 * - This is separate from UserType to allow for a SYSTEM role (AI/workflow engine)
 * - Maps 1:1 with UserType for human users
 * - SYSTEM is a special role for automated processes (AI, schedulers, etc.)
 * - When migrating to JWT/Spring Security, this can be extended or mapped to authorities
 */
public enum UserRole {
    
    CITIZEN,
    STAFF,
    DEPT_HEAD,
    COMMISSIONER,      // Maps to MUNICIPAL_COMMISSIONER in UserType
    ADMIN,
    SUPER_ADMIN,
    SYSTEM;            // Special role for AI/automated processes
    
    /**
     * Convert from UserType enum to UserRole.
     * Used when creating UserContext from authenticated user data.
     * 
     * @param userType The UserType from the User entity
     * @return Corresponding UserRole
     * @throws IllegalArgumentException if userType is null or unmapped
     */
    public static UserRole fromUserType(UserType userType) {
        if (userType == null) {
            throw new IllegalArgumentException("UserType cannot be null");
        }
        
        return switch (userType) {
            case CITIZEN -> CITIZEN;
            case STAFF -> STAFF;
            case DEPT_HEAD -> DEPT_HEAD;
            case MUNICIPAL_COMMISSIONER -> COMMISSIONER;
            case ADMIN -> ADMIN;
            case SUPER_ADMIN -> SUPER_ADMIN;
        };
    }
    
    /**
     * Check if this role represents an administrative role.
     * Useful for audit logging and permission escalation checks.
     */
    public boolean isAdministrative() {
        return this == ADMIN || this == SUPER_ADMIN || this == COMMISSIONER;
    }
    
    /**
     * Check if this role can manage complaints operationally.
     * Staff and Department Heads handle day-to-day complaint resolution.
     */
    public boolean isOperational() {
        return this == STAFF || this == DEPT_HEAD;
    }
    
    /**
     * Check if this is a system/automated role.
     */
    public boolean isSystem() {
        return this == SYSTEM;
    }
}
