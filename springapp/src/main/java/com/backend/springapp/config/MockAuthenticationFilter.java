package com.backend.springapp.config;

import com.backend.springapp.enums.UserType;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.UserRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserContextHolder;
import com.backend.springapp.security.UserRole;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Mock authentication filter for development and testing.
 * 
 * DESIGN INTENT:
 * - Extracts user context from HTTP headers
 * - Populates UserContextHolder for thread-local access
 * - Clears context after request processing
 * 
 * MIGRATION TO JWT/SPRING SECURITY:
 * When adding real authentication:
 * 1. Remove this filter
 * 2. Create a JwtAuthenticationFilter that:
 *    - Validates JWT token
 *    - Extracts claims (userId, role, departmentId)
 *    - Creates UserContext and sets in UserContextHolder
 * 3. Configure Spring Security filter chain
 * 
 * No changes needed in controllers, services, or business logic.
 * 
 * HEADERS EXPECTED:
 * - X-User-Id: User's database ID
 * - X-User-Role: Role name (CITIZEN, STAFF, DEPT_HEAD, ADMIN, SYSTEM, etc.)
 * - X-User-Type: UserType enum value (alternative to X-User-Role)
 * - X-Department-Id: User's department ID (for STAFF, DEPT_HEAD)
 */
@Component
@Order(1)
public class MockAuthenticationFilter implements Filter {
    
    private static final Logger log = LoggerFactory.getLogger(MockAuthenticationFilter.class);
    
    private final UserRepository userRepository;
    
    public MockAuthenticationFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        try {
            // Extract user context from headers
            UserContext userContext = extractUserContext(httpRequest);
            
            if (userContext != null) {
                UserContextHolder.setContext(userContext);
                log.debug("UserContext set for request: {}", userContext);
            }
            
            chain.doFilter(request, response);
            
        } finally {
            // Always clear context after request
            UserContextHolder.clear();
        }
    }
    
    private UserContext extractUserContext(HttpServletRequest request) {
        // Check for SYSTEM role first (no user ID needed)
        String roleHeader = request.getHeader("X-User-Role");
        if ("SYSTEM".equalsIgnoreCase(roleHeader)) {
            return UserContext.system();
        }
        
        // Try to get user ID
        String userIdHeader = request.getHeader("X-User-Id");
        if (userIdHeader == null || userIdHeader.isEmpty()) {
            return null; // No authentication info provided
        }
        
        Long userId;
        try {
            userId = Long.parseLong(userIdHeader);
        } catch (NumberFormatException e) {
            log.warn("Invalid X-User-Id header: {}", userIdHeader);
            return null;
        }
        
        // Try to fetch from database for accurate role/department
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                UserRole role = UserRole.fromUserType(user.getUserType());
                return new UserContext(userId, role, user.getDeptId());
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user {}: {}", userId, e.getMessage());
        }
        
        // Fall back to header-based context
        UserRole role = extractRole(request);
        Long departmentId = extractDepartmentId(request);
        
        if (role == null) {
            log.warn("No role could be determined for user {}", userId);
            return null;
        }
        
        return new UserContext(userId, role, departmentId);
    }
    
    private UserRole extractRole(HttpServletRequest request) {
        // Try X-User-Role first
        String roleHeader = request.getHeader("X-User-Role");
        if (roleHeader != null && !roleHeader.isEmpty()) {
            try {
                return UserRole.valueOf(roleHeader.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid X-User-Role: {}", roleHeader);
            }
        }
        
        // Try X-User-Type (UserType enum)
        String typeHeader = request.getHeader("X-User-Type");
        if (typeHeader != null && !typeHeader.isEmpty()) {
            try {
                UserType userType = UserType.valueOf(typeHeader.toUpperCase());
                return UserRole.fromUserType(userType);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid X-User-Type: {}", typeHeader);
            }
        }
        
        return null;
    }
    
    private Long extractDepartmentId(HttpServletRequest request) {
        String deptHeader = request.getHeader("X-Department-Id");
        if (deptHeader == null || deptHeader.isEmpty()) {
            return null;
        }
        
        try {
            return Long.parseLong(deptHeader);
        } catch (NumberFormatException e) {
            log.warn("Invalid X-Department-Id: {}", deptHeader);
            return null;
        }
    }
}
