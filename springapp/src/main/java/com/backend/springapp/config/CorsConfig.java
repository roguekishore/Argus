package com.backend.springapp.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

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
 * 
 * IMPORTANT: This filter runs FIRST (highest precedence) to handle 
 * preflight OPTIONS requests before any authentication filters.
 */
@Configuration
public class CorsConfig {

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration() {
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(corsFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Allow ALL origins (for development/demo purposes)
        config.addAllowedOriginPattern("*");
        
        System.out.println("✓ CORS enabled for ALL origins (*)");
        
        // Allow all common HTTP methods
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        
        // Allow all headers (including Authorization for JWT)
        config.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With"
        ));
        
        // Expose headers that frontend might need to read
        config.setExposedHeaders(Arrays.asList(
            "Authorization"
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
