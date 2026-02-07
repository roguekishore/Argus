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
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Mock authentication filter for LOCAL DEVELOPMENT and testing ONLY.
 * 
 * DISABLED BY DEFAULT in production (jwt.enabled=true disables this filter).
 * Enable by setting jwt.enabled=false for local development testing.
 * 
 * Uses custom headers (X-User-Id, X-User-Role) which work locally but NOT with CloudFront.
 * For production deployment, use JwtAuthenticationFilter instead.
 */
@Component
@Order(3)  // Runs AFTER JwtAuthenticationFilter (order 2)
public class MockAuthenticationFilter implements Filter {
    
    private static final Logger log = LoggerFactory.getLogger(MockAuthenticationFilter.class);
    
    private final UserRepository userRepository;
    
    @Value("${jwt.enabled:true}")
    private boolean jwtEnabled;
    
    public MockAuthenticationFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        // SKIP this filter if JWT is enabled (production mode)
        if (jwtEnabled) {
            chain.doFilter(request, response);
            return;
        }
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        // Skip OPTIONS preflight requests - they're handled by CorsFilter
        if ("OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        
        // Only use mock auth if JWT filter hasn't already set context
        if (UserContextHolder.getContext() != null) {
            chain.doFilter(request, response);
            return;
        }
        
        try {
            // Extract user context from headers (development only)
            UserContext userContext = extractUserContext(httpRequest);
            
            if (userContext != null) {
                UserContextHolder.setContext(userContext);
                log.debug("MockAuth: UserContext set for request: {}", userContext);
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
