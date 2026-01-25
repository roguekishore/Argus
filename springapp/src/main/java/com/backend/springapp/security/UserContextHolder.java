package com.backend.springapp.security;

/**
 * Thread-local holder for UserContext.
 * 
 * DESIGN INTENT:
 * - Provides a way to access UserContext without passing it through all layers
 * - Similar to Spring Security's SecurityContextHolder pattern
 * - ONLY use this when you absolutely need global access (e.g., audit interceptors)
 * - For service methods, PREFER passing UserContext as an explicit parameter
 * 
 * FUTURE MIGRATION:
 * - When adding JWT/Spring Security, this can be replaced or wrapped around
 *   SecurityContextHolder to extract UserContext from Authentication
 * 
 * THREAD SAFETY:
 * - Uses InheritableThreadLocal for async/child thread support
 * - Always call clear() after request processing (in a filter/interceptor)
 */
public final class UserContextHolder {
    
    private static final InheritableThreadLocal<UserContext> contextHolder = 
        new InheritableThreadLocal<>();
    
    private UserContextHolder() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Set the current user context for this thread.
     * Typically called by a filter/interceptor at the start of request processing.
     */
    public static void setContext(UserContext context) {
        if (context == null) {
            contextHolder.remove();
        } else {
            contextHolder.set(context);
        }
    }
    
    /**
     * Get the current user context.
     * 
     * @return The current UserContext, or null if not set
     */
    public static UserContext getContext() {
        return contextHolder.get();
    }
    
    /**
     * Get the current user context, throwing if not set.
     * Use this when a user context is required.
     * 
     * @return The current UserContext
     * @throws IllegalStateException if no context is set
     */
    public static UserContext requireContext() {
        UserContext context = contextHolder.get();
        if (context == null) {
            throw new IllegalStateException(
                "No UserContext found in current thread. " +
                "Ensure authentication filter/interceptor is configured."
            );
        }
        return context;
    }
    
    /**
     * Clear the current user context.
     * MUST be called after request processing completes (in a finally block or filter).
     */
    public static void clear() {
        contextHolder.remove();
    }
    
    /**
     * Check if a user context is present.
     */
    public static boolean hasContext() {
        return contextHolder.get() != null;
    }
}
