package com.backend.springapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.model.Complaint;

import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    
    // ==================== CITIZEN QUERIES ====================
    
    // Find complaints by citizen ID, ordered by most recent first
    List<Complaint> findByCitizenIdOrderByCreatedTimeDesc(Long citizenId);
    
    // Find complaints by citizen phone number
    List<Complaint> findByCitizenMobileOrderByCreatedTimeDesc(String mobile);
    
    // ==================== STAFF QUERIES ====================
    
    // Find complaints assigned to a specific staff member
    List<Complaint> findByStaffIdOrderByCreatedTimeDesc(Long staffId);
    
    // Find complaints assigned to staff with specific status
    List<Complaint> findByStaffIdAndStatusOrderByCreatedTimeDesc(Long staffId, ComplaintStatus status);
    
    // ==================== DEPARTMENT QUERIES ====================
    
    // Find all complaints for a department
    List<Complaint> findByDepartmentIdOrderByCreatedTimeDesc(Long departmentId);
    
    // Find complaints by department and status
    List<Complaint> findByDepartmentIdAndStatusOrderByCreatedTimeDesc(Long departmentId, ComplaintStatus status);
    
    // Find unassigned complaints in a department (for dept head to assign)
    // Note: This returns all unassigned, use the query below to exclude cancelled/closed
    List<Complaint> findByDepartmentIdAndStaffIsNullOrderByCreatedTimeDesc(Long departmentId);
    
    // Find unassigned complaints excluding cancelled and closed statuses
    @Query("SELECT c FROM Complaint c WHERE c.department.id = :departmentId AND c.staff IS NULL " +
           "AND c.status NOT IN (com.backend.springapp.enums.ComplaintStatus.CANCELLED, " +
           "com.backend.springapp.enums.ComplaintStatus.CLOSED) ORDER BY c.createdTime DESC")
    List<Complaint> findUnassignedActiveByDepartment(@Param("departmentId") Long departmentId);
    
    // Count unassigned active complaints (excluding cancelled/closed)
    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.department.id = :departmentId AND c.staff IS NULL " +
           "AND c.status NOT IN (com.backend.springapp.enums.ComplaintStatus.CANCELLED, " +
           "com.backend.springapp.enums.ComplaintStatus.CLOSED)")
    long countUnassignedActiveByDepartment(@Param("departmentId") Long departmentId);
    
    // ==================== ADMIN/SYSTEM QUERIES ====================
    
    // Find all complaints ordered by creation time
    List<Complaint> findAllByOrderByCreatedTimeDesc();
    
    // Find complaints by status
    List<Complaint> findByStatusOrderByCreatedTimeDesc(ComplaintStatus status);
    
    // ==================== ESCALATION QUERIES ====================
    
    // Find complaints by escalation level
    List<Complaint> findByEscalationLevelOrderByCreatedTimeDesc(int escalationLevel);
    
    // Find escalated complaints (level > 0)
    @Query("SELECT c FROM Complaint c WHERE c.escalationLevel > 0 ORDER BY c.escalationLevel DESC, c.createdTime DESC")
    List<Complaint> findEscalatedComplaints();
    
    // ==================== MANUAL ROUTING QUERIES ====================
    
    // Find complaints needing manual routing (low AI confidence)
    List<Complaint> findByNeedsManualRoutingTrueOrderByCreatedTimeDesc();
    
    // Count complaints needing manual routing
    long countByNeedsManualRoutingTrue();

    // ==================== COUNT QUERIES (for stats) ====================
    
    long countByCitizenId(Long citizenId);
    
    long countByCitizenIdAndStatus(Long citizenId, ComplaintStatus status);
    
    long countByStaffId(Long staffId);
    
    long countByStaffIdAndStatus(Long staffId, ComplaintStatus status);
    
    long countByDepartmentId(Long departmentId);
    
    long countByDepartmentIdAndStatus(Long departmentId, ComplaintStatus status);
    
    long countByStatus(ComplaintStatus status);
    
    long countByEscalationLevelGreaterThan(int level);
}
