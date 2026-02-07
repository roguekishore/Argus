package com.backend.springapp.config;

import com.backend.springapp.security.JwtService;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserContextHolder;
import com.backend.springapp.security.UserRole;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;

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
import java.util.List;

/**
 * JWT Authentication Filter - Replaces MockAuthenticationFilter for production.
 * 
 * Extracts JWT from Authorization header and populates UserContextHolder.
 * Uses standard Authorization: Bearer <token> header which works with CloudFront.
 * 
 * PUBLIC ENDPOINTS (no auth required):
 * - /api/auth/** - Login and registration
 * - /api/whatsapp/** - Twilio webhooks
 * - OPTIONS requests - CORS preflight
 */
@Component
@Order(2)  // Runs AFTER CorsFilter (which has HIGHEST_PRECEDENCE)
public class JwtAuthenticationFilter implements Filter {
    
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    private final JwtService jwtService;
    
    @Value("${jwt.enabled:true}")
    private boolean jwtEnabled;
    
    // Public endpoints that don't require authentication
    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/auth/",
        "/api/whatsapp/",
        "/api/public/",
        "/actuator/",
        "/health",
        "/error"
    );
    
    // System endpoints (internal calls, no auth needed)
    private static final List<String> SYSTEM_PATHS = List.of(
        "/system/start",
        "/system/close"
    );
    
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Skip OPTIONS preflight requests - handled by CorsFilter
        if ("OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        
        String requestPath = httpRequest.getRequestURI();
        
        // Skip public endpoints
        if (isPublicPath(requestPath)) {
            chain.doFilter(request, response);
            return;
        }
        
        // Skip system endpoints (internal calls)
        if (isSystemPath(requestPath)) {
            chain.doFilter(request, response);
            return;
        }
        
        try {
            // Extract and validate JWT token
            UserContext userContext = extractUserContext(httpRequest);
            
            if (userContext != null) {
                UserContextHolder.setContext(userContext);
                log.debug("JWT UserContext set: userId={}, role={}", 
                    userContext.userId(), userContext.role());
            } else if (jwtEnabled) {
                // No valid token and JWT is required
                httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"error\":\"Unauthorized - Invalid or missing token\"}");
                return;
            }
            
            chain.doFilter(request, response);
            
        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired: {}", e.getMessage());
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\":\"Token expired\",\"code\":\"TOKEN_EXPIRED\"}");
            return;
        } catch (MalformedJwtException | SignatureException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\":\"Invalid token\"}");
            return;
        } finally {
            // Always clear context after request
            UserContextHolder.clear();
        }
    }
    
    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }
    
    private boolean isSystemPath(String path) {
        return SYSTEM_PATHS.stream().anyMatch(path::contains);
    }
    
    private UserContext extractUserContext(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No Bearer token found in Authorization header");
            return null;
        }
        
        String token = authHeader.substring(7); // Remove "Bearer " prefix
        
        try {
            Claims claims = jwtService.validateToken(token);
            
            Long userId = claims.get("userId", Long.class);
            String roleStr = claims.get("role", String.class);
            Long departmentId = claims.get("departmentId", Long.class);
            
            if (userId == null || roleStr == null) {
                log.warn("JWT missing required claims: userId or role");
                return null;
            }
            
            UserRole role;
            try {
                role = UserRole.valueOf(roleStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid role in JWT: {}", roleStr);
                return null;
            }
            
            return new UserContext(userId, role, departmentId);
            
        } catch (ExpiredJwtException | MalformedJwtException | SignatureException e) {
            throw e; // Re-throw to be handled by outer catch
        } catch (Exception e) {
            log.error("Error extracting user context from JWT: {}", e.getMessage());
            return null;
        }
    }
}
