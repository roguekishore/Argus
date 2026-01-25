package com.backend.springapp.config;

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
 * This configuration allows the React frontend (localhost:3000) to communicate
 * with the Spring Boot backend (localhost:8080) during development.
 * 
 * PRODUCTION NOTE:
 * Update allowedOrigins to your production domain(s) before deploying.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Allow specific origins (React dev server)
        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ));
        
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
