# Error Handling Documentation

## Overview
The application now includes comprehensive error handling that returns user-friendly error messages without exposing stack traces.

## Error Response Format
All errors return a consistent JSON structure:

```json
{
  "timestamp": "2026-01-20T10:30:00",
  "status": 400,
  "error": "Validation Error",
  "message": "Invalid input data",
  "path": "/api/users",
  "errors": [
    "Mobile number is required",
    "Email should be valid"
  ]
}
```

## Error Types

### 1. Validation Errors (400 Bad Request)
Triggered when input validation fails:
- **Missing required fields**: "Name is required", "Password is required", "Mobile number is required"
- **Invalid format**: "Email should be valid", "Mobile number must be 10 digits"
- **Password too short**: "Password must be at least 6 characters"

**Example Request:**
```json
POST /api/users
{
  "name": "",
  "email": "invalid-email",
  "password": "123",
  "mobile": "12345"
}
```

**Example Response:**
```json
{
  "timestamp": "2026-01-20T10:30:00",
  "status": 400,
  "error": "Validation Error",
  "message": "Invalid input data",
  "path": "/api/users",
  "errors": [
    "Name is required",
    "Email should be valid",
    "Password must be at least 6 characters",
    "Mobile number must be 10 digits"
  ]
}
```

### 2. Duplicate Resource Errors (409 Conflict)
Triggered when trying to create/update with existing email or mobile:
- **Duplicate email**: "Email already exists"
- **Duplicate mobile**: "Mobile number already exists"

**Example Request:**
```json
POST /api/users
{
  "name": "John Doe",
  "email": "existing@email.com",
  "password": "password123",
  "mobile": "9876543210"
}
```

**Example Response:**
```json
{
  "timestamp": "2026-01-20T10:30:00",
  "status": 409,
  "error": "Duplicate Resource",
  "message": "Email already exists",
  "path": "/api/users"
}
```

### 3. Resource Not Found (404 Not Found)
Triggered when requested resource doesn't exist:
- **User not found by ID**: "User not found with id: 123"
- **User not found by email**: "User not found with email: test@email.com"
- **User not found by mobile**: "User not found with mobile: 9876543210"

**Example Response:**
```json
{
  "timestamp": "2026-01-20T10:30:00",
  "status": 404,
  "error": "Resource Not Found",
  "message": "User not found with id: 123",
  "path": "/api/users/123"
}
```

### 4. Internal Server Error (500)
Triggered when unexpected errors occur:

**Example Response:**
```json
{
  "timestamp": "2026-01-20T10:30:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "path": "/api/users"
}
```

## Validation Rules

### UserRequestDTO
- **name**: Required, cannot be blank
- **email**: Must be a valid email format (optional field)
- **password**: Required, minimum 6 characters
- **mobile**: Required, must be exactly 10 digits
- **userType**: Optional (defaults to CITIZEN if not provided)
- **deptId**: Optional

## Implementation Details

### Custom Exceptions
- **ResourceNotFoundException**: Used for 404 errors
- **DuplicateResourceException**: Used for duplicate resource errors

### Global Exception Handler
The `GlobalExceptionHandler` class uses `@RestControllerAdvice` to handle all exceptions globally:
- Catches validation errors from `@Valid` annotations
- Catches custom exceptions (ResourceNotFoundException, DuplicateResourceException)
- Catches all unexpected exceptions
- Returns formatted error responses without stack traces

### Benefits
1. **Consistent error format**: All errors follow the same structure
2. **Security**: No stack traces exposed to clients
3. **User-friendly**: Clear, actionable error messages
4. **Multiple validation errors**: Returns all validation errors at once
5. **Proper HTTP status codes**: Uses appropriate status codes for different error types
