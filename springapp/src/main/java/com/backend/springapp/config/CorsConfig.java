package com.backend.springapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * Global CORS configuration for the application.
 * 
 * Dynamically configures allowed origins based on environment.
 * 
 * PRODUCTION SETUP:
 * Set CORS_ALLOWED_ORIGINS environment variable to your production domain(s).
 * Example: https://yourdomain.com,https://www.yourdomain.com
 * 
 * For CNAME setup (e.g., api.yourdomain.com):
 * - Backend runs at: https://api.yourdomain.com
 * - Frontend runs at: https://yourdomain.com or https://www.yourdomain.com
 * - Set CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
 */
@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Parse comma-separated origins from environment
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        config.setAllowedOrigins(origins);
        
        System.out.println("✓ CORS enabled for origins: " + origins);
        
        // Allow all common HTTP methods
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        
        // Allow all headers (including custom auth headers)
        config.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "X-User-Id",
            "X-User-Role",
            "X-Department-Id"
        ));
        
        // Expose headers that frontend might need to read
        config.setExposedHeaders(Arrays.asList(
            "Authorization",
            "X-User-Id",
            "X-User-Role",
            "X-Department-Id"
        ));
        
        // Allow credentials (cookies, authorization headers)
        config.setAllowCredentials(true);
        
        // Cache preflight response for 1 hour
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply CORS to all endpoints
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }
}
