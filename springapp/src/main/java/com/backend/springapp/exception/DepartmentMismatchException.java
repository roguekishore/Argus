package com.backend.springapp.exception;

/**
 * Exception thrown when a staff/dept_head tries to operate on a complaint
 * that doesn't belong to their department.
 * 
 * This is an AUTHORIZATION exception specific to department membership.
 * Staff and Department Heads can only resolve complaints in their department.
 * 
 * Examples:
 * - STAFF from Roads department trying to resolve a Water department complaint
 * - DEPT_HEAD trying to resolve a complaint assigned to a different department
 * 
 * HTTP mapping: 403 Forbidden
 */
public class DepartmentMismatchException extends RuntimeException {
    
    private final Long complaintId;
    private final Long userDepartmentId;
    private final Long complaintDepartmentId;
    
    public DepartmentMismatchException(
            Long complaintId,
            Long userDepartmentId,
            Long complaintDepartmentId,
            String message) {
        super(message);
        this.complaintId = complaintId;
        this.userDepartmentId = userDepartmentId;
        this.complaintDepartmentId = complaintDepartmentId;
    }
    
    public DepartmentMismatchException(
            Long complaintId,
            Long userDepartmentId,
            Long complaintDepartmentId) {
        this(
            complaintId,
            userDepartmentId,
            complaintDepartmentId,
            buildDefaultMessage(complaintId, userDepartmentId, complaintDepartmentId)
        );
    }
    
    private static String buildDefaultMessage(
            Long complaintId,
            Long userDepartmentId,
            Long complaintDepartmentId) {
        return String.format(
            "User's department (%d) does not match complaint %d's department (%d)",
            userDepartmentId, complaintId, complaintDepartmentId
        );
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
    
    public Long getUserDepartmentId() {
        return userDepartmentId;
    }
    
    public Long getComplaintDepartmentId() {
        return complaintDepartmentId;
    }
}
