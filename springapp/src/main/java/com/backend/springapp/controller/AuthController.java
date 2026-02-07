package com.backend.springapp.controller;

import com.backend.springapp.dto.request.UserRequestDTO;
import com.backend.springapp.dto.response.UserResponseDTO;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.UserRepository;
import com.backend.springapp.security.JwtService;
import com.backend.springapp.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Authentication Controller for login and registration.
 * 
 * PRODUCTION JWT Authentication:
 * - Login returns { token, refreshToken, user }
 * - /refresh endpoint for token refresh
 * - /me endpoint for token validation
 * 
 * Uses standard Authorization: Bearer header (CloudFront compatible)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtService jwtService;
    
    /**
     * Login endpoint - validates credentials and returns JWT tokens
     * 
     * Request: { "email": "...", "password": "..." }
     * Response: { "token": "...", "refreshToken": "...", "userId": 12, "role": "STAFF", ... }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Email and password are required"
            ));
        }
        
        // Find user by email
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", "Invalid email or password"
            ));
        }
        
        User user = userOpt.get();
        
        // SIMPLE PASSWORD CHECK (for development)
        // TODO: Replace with proper password hashing (BCrypt) in production
        if (!password.equals(user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", "Invalid email or password"
            ));
        }
        
        // Generate JWT tokens
        String token = jwtService.generateToken(
            user.getUserId(), 
            user.getUserType().name(), 
            user.getDeptId()
        );
        String refreshToken = jwtService.generateRefreshToken(user.getUserId());
        
        // Build response with tokens and user data
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("refreshToken", refreshToken);
        response.put("userId", user.getUserId());
        response.put("role", user.getUserType().name());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("phone", user.getMobile());
        
        // Include departmentId if user has one
        if (user.getDeptId() != null) {
            response.put("departmentId", user.getDeptId());
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Refresh token endpoint - get new access token using refresh token
     * 
     * Request: { "refreshToken": "..." }
     * Response: { "token": "...", "refreshToken": "..." }
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        
        if (refreshToken == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Refresh token is required"
            ));
        }
        
        try {
            // Validate refresh token and extract user ID
            Long userId = jwtService.extractUserId(refreshToken);
            
            // Fetch user to get current role/department (in case they changed)
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "User not found"
                ));
            }
            
            User user = userOpt.get();
            
            // Generate new tokens
            String newToken = jwtService.generateToken(
                user.getUserId(), 
                user.getUserType().name(), 
                user.getDeptId()
            );
            String newRefreshToken = jwtService.generateRefreshToken(user.getUserId());
            
            return ResponseEntity.ok(Map.of(
                "token", newToken,
                "refreshToken", newRefreshToken
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", "Invalid or expired refresh token"
            ));
        }
    }
    
    /**
     * Get current user info (validates token)
     * 
     * Authorization: Bearer <token>
     * Response: { "userId": 12, "role": "STAFF", ... }
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", "No token provided"
            ));
        }
        
        String token = authHeader.substring(7);
        
        try {
            Long userId = jwtService.extractUserId(token);
            
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "User not found"
                ));
            }
            
            User user = userOpt.get();
            
            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getUserId());
            response.put("role", user.getUserType().name());
            response.put("email", user.getEmail());
            response.put("name", user.getName());
            response.put("phone", user.getMobile());
            
            if (user.getDeptId() != null) {
                response.put("departmentId", user.getDeptId());
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", "Invalid or expired token"
            ));
        }
    }
    
    /**
     * Registration endpoint - creates a new citizen user
     * 
     * Request: { "name": "...", "email": "...", "phone": "...", "password": "..." }
     * Response: { "message": "Registration successful", "userId": 123 }
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRequestDTO request) {
        try {
            // Check if email already exists
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Email already registered"
                ));
            }
            
            // Check if phone already exists
            if (request.getMobile() != null && 
                userRepository.findByMobile(request.getMobile()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Phone number already registered"
                ));
            }
            
            // Create the user
            UserResponseDTO createdUser = userService.createUser(request);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Registration successful",
                "userId", createdUser.getUserId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Registration failed: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Logout endpoint (stateless - just for completeness)
     * 
     * CURRENT: No-op (client handles logout by clearing localStorage)
     * FUTURE JWT: Could blacklist tokens if needed
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // Stateless auth - nothing to do server-side
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
