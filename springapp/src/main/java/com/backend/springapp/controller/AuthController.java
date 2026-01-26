package com.backend.springapp.controller;

import com.backend.springapp.dto.request.UserRequestDTO;
import com.backend.springapp.dto.response.UserResponseDTO;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.UserRepository;
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
 * CURRENT: Simple authentication (no JWT)
 * - Login validates credentials and returns user data
 * - Register creates user and returns success message
 * 
 * FUTURE: JWT Authentication
 * - Login returns { token, refreshToken, user }
 * - Add /refresh endpoint for token refresh
 * - Add /me endpoint for token validation
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserService userService;
    
    /**
     * Login endpoint - validates credentials and returns user data
     * 
     * Request: { "email": "...", "password": "..." }
     * Response: { "userId": 12, "role": "STAFF", "departmentId": 3, ... }
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
        
        // Build response with user data
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("role", user.getUserType().name());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("phone", user.getMobile());
        
        // Include departmentId if user has one (use deptId field directly)
        if (user.getDeptId() != null) {
            response.put("departmentId", user.getDeptId());
        }
        
        return ResponseEntity.ok(response);
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
