package com.backend.springapp.exception;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import com.backend.springapp.dto.response.ErrorResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    /**
     * Handle validation errors (e.g., @NotBlank, @Email, @Pattern)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {
        
        List<String> errors = new ArrayList<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.add(error.getDefaultMessage());
        }
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Validation Error")
            .message("Invalid input data")
            .path(request.getDescription(false).replace("uri=", ""))
            .errors(errors)
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    
    /**
     * Handle duplicate resource errors (e.g., duplicate email or mobile)
     */
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResourceException(
            DuplicateResourceException ex, WebRequest request) {
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.CONFLICT.value())
            .error("Duplicate Resource")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }
    
    /**
     * Handle resource not found errors
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Resource Not Found")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }
    
    // ==================== STATE TRANSITION EXCEPTIONS ====================
    
    /**
     * Handle invalid state transition errors.
     * 
     * Thrown when a transition violates the state machine rules.
     * E.g., trying to go from CLOSED back to IN_PROGRESS.
     * 
     * HTTP 400 Bad Request - the operation itself is invalid
     */
    @ExceptionHandler(InvalidStateTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidStateTransitionException(
            InvalidStateTransitionException ex, WebRequest request) {
        
        log.warn("Invalid state transition: complaint={}, {} -> {}", 
            ex.getComplaintId(), ex.getFromState(), ex.getToState());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Invalid State Transition")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .errors(List.of(
                String.format("Current state: %s", ex.getFromState()),
                String.format("Attempted state: %s", ex.getToState())
            ))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    
    /**
     * Handle unauthorized state transition errors.
     * 
     * Thrown when the user's role doesn't have permission for the transition.
     * The transition itself is valid, but the user can't perform it.
     * 
     * HTTP 403 Forbidden - authenticated but not authorized
     */
    @ExceptionHandler(UnauthorizedStateTransitionException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedStateTransitionException(
            UnauthorizedStateTransitionException ex, WebRequest request) {
        
        log.warn("Unauthorized state transition: complaint={}, role={}, {} -> {}", 
            ex.getComplaintId(), ex.getAttemptedRole(), ex.getFromState(), ex.getToState());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.FORBIDDEN.value())
            .error("Unauthorized State Transition")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .errors(List.of(
                String.format("Your role: %s", ex.getAttemptedRole()),
                String.format("Allowed roles: %s", ex.getAllowedRoles())
            ))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }
    
    /**
     * Handle complaint ownership errors.
     * 
     * Thrown when a citizen tries to operate on someone else's complaint.
     * 
     * HTTP 403 Forbidden - not the owner of the resource
     */
    @ExceptionHandler(ComplaintOwnershipException.class)
    public ResponseEntity<ErrorResponse> handleComplaintOwnershipException(
            ComplaintOwnershipException ex, WebRequest request) {
        
        log.warn("Ownership check failed: complaint={}, attemptedUser={}, actualOwner={}", 
            ex.getComplaintId(), ex.getAttemptedUserId(), ex.getActualOwnerId());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.FORBIDDEN.value())
            .error("Ownership Required")
            .message("You can only perform this action on your own complaints")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }
    
    /**
     * Handle department mismatch errors.
     * 
     * Thrown when a staff/dept_head tries to operate on a complaint
     * from a different department.
     * 
     * HTTP 403 Forbidden - not in the correct department
     */
    @ExceptionHandler(DepartmentMismatchException.class)
    public ResponseEntity<ErrorResponse> handleDepartmentMismatchException(
            DepartmentMismatchException ex, WebRequest request) {
        
        log.warn("Department mismatch: complaint={}, userDept={}, complaintDept={}", 
            ex.getComplaintId(), ex.getUserDepartmentId(), ex.getComplaintDepartmentId());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.FORBIDDEN.value())
            .error("Department Mismatch")
            .message("You can only operate on complaints assigned to your department")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }
    
    // ==================== DOMAIN RULE GUARD EXCEPTIONS ====================
    
    /**
     * Handle resolution proof required errors.
     * 
     * Thrown when staff tries to resolve a complaint without submitting proof first.
     * This enforces the domain rule: proof must exist before resolution.
     * 
     * HTTP 422 Unprocessable Entity - precondition not met
     */
    @ExceptionHandler(ResolutionProofRequiredException.class)
    public ResponseEntity<ErrorResponse> handleResolutionProofRequiredException(
            ResolutionProofRequiredException ex, WebRequest request) {
        
        log.warn("Resolution proof required: complaint={}", ex.getComplaintId());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.UNPROCESSABLE_ENTITY.value())
            .error("Resolution Proof Required")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .errors(List.of(
                "Submit proof via: POST /api/complaints/" + ex.getComplaintId() + "/resolution-proof",
                "Then retry the resolve operation"
            ))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    
    /**
     * Handle citizen signoff required errors.
     * 
     * Thrown when attempting to close a complaint without citizen acceptance.
     * This enforces the domain rule: only the citizen who filed can close.
     * 
     * HTTP 422 Unprocessable Entity - precondition not met
     */
    @ExceptionHandler(SignoffRequiredException.class)
    public ResponseEntity<ErrorResponse> handleSignoffRequiredException(
            SignoffRequiredException ex, WebRequest request) {
        
        log.warn("Citizen signoff required: complaint={}", ex.getComplaintId());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.UNPROCESSABLE_ENTITY.value())
            .error("Citizen Signoff Required")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .errors(List.of(
                "Only the citizen who filed this complaint can close it",
                "Citizen must accept resolution via: POST /api/complaints/" + ex.getComplaintId() + "/signoff"
            ))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    
    // ==================== DISPUTE EXCEPTIONS ====================
    
    /**
     * Handle invalid dispute state errors.
     * 
     * Thrown when a dispute operation is attempted on a complaint
     * that is not in the expected state for that operation.
     * 
     * HTTP 400 Bad Request - the operation precondition is not met
     */
    @ExceptionHandler(InvalidDisputeStateException.class)
    public ResponseEntity<ErrorResponse> handleInvalidDisputeStateException(
            InvalidDisputeStateException ex, WebRequest request) {
        
        log.warn("Invalid dispute state: complaint={}, current={}, expected={}", 
            ex.getComplaintId(), ex.getCurrentState(), ex.getExpectedState());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Invalid Dispute State")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    
    /**
     * Handle duplicate dispute errors.
     * 
     * Thrown when a citizen attempts to file a dispute when they already
     * have a pending dispute for the same complaint.
     * 
     * HTTP 409 Conflict - duplicate operation
     */
    @ExceptionHandler(DuplicateDisputeException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateDisputeException(
            DuplicateDisputeException ex, WebRequest request) {
        
        log.warn("Duplicate dispute: complaint={}", ex.getComplaintId());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.CONFLICT.value())
            .error("Duplicate Dispute")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .errors(List.of(
                "Only one dispute can be pending at a time per complaint",
                "Wait for the department to review your existing dispute"
            ))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }
    
    /**
     * Handle illegal argument exceptions (validation errors in service layer).
     * 
     * HTTP 400 Bad Request
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex, WebRequest request) {
        
        log.warn("Invalid argument: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Invalid Request")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    
    /**
     * Handle all other exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(
            Exception ex, WebRequest request) {
        
        log.error("Unexpected error occurred", ex);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("An unexpected error occurred")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
