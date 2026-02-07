package com.backend.springapp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT Service for token generation and validation.
 * 
 * This replaces the custom header approach with standard JWT authentication.
 * Works with CloudFront free tier since Authorization header is supported.
 */
@Service
public class JwtService {
    
    @Value("${jwt.secret:your-256-bit-secret-key-for-jwt-signing-must-be-long-enough}")
    private String jwtSecret;
    
    @Value("${jwt.expiration:86400000}") // 24 hours default
    private long jwtExpiration;
    
    @Value("${jwt.refresh-expiration:604800000}") // 7 days default
    private long refreshExpiration;
    
    /**
     * Generate access token with user claims
     */
    public String generateToken(Long userId, String role, Long departmentId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("role", role);
        if (departmentId != null) {
            claims.put("departmentId", departmentId);
        }
        
        return Jwts.builder()
                .claims(claims)
                .subject(userId.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }
    
    /**
     * Generate refresh token (longer lived, minimal claims)
     */
    public String generateRefreshToken(Long userId) {
        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpiration))
                .signWith(getSigningKey())
                .compact();
    }
    
    /**
     * Validate token and extract claims
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = validateToken(token);
            return claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return true;
        }
    }
    
    /**
     * Extract user ID from token
     */
    public Long extractUserId(String token) {
        Claims claims = validateToken(token);
        return claims.get("userId", Long.class);
    }
    
    /**
     * Extract role from token
     */
    public String extractRole(String token) {
        Claims claims = validateToken(token);
        return claims.get("role", String.class);
    }
    
    /**
     * Extract department ID from token (may be null)
     */
    public Long extractDepartmentId(String token) {
        Claims claims = validateToken(token);
        return claims.get("departmentId", Long.class);
    }
    
    private SecretKey getSigningKey() {
        // Ensure key is at least 256 bits (32 bytes)
        byte[] keyBytes = jwtSecret.getBytes();
        if (keyBytes.length < 32) {
            // Pad with zeros if too short (development only - use proper secret in production)
            byte[] paddedKey = new byte[32];
            System.arraycopy(keyBytes, 0, paddedKey, 0, keyBytes.length);
            keyBytes = paddedKey;
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
