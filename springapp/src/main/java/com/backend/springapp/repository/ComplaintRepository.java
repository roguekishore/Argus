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
    List<Complaint> findByCitizenUserIdOrderByCreatedTimeDesc(Long citizenId);
    
    // Find complaints by citizen phone number
    List<Complaint> findByCitizenMobileOrderByCreatedTimeDesc(String mobile);
    
    // ==================== STAFF QUERIES ====================
    
    // Find complaints assigned to a specific staff member
    List<Complaint> findByStaffUserIdOrderByCreatedTimeDesc(Long staffId);
    
    // Find complaints assigned to staff with specific status
    List<Complaint> findByStaffUserIdAndStatusOrderByCreatedTimeDesc(Long staffId, ComplaintStatus status);
    
    // ==================== DEPARTMENT QUERIES ====================
    
    // Find all complaints for a department
    List<Complaint> findByDepartmentIdOrderByCreatedTimeDesc(Long departmentId);
    
    // Find complaints by department and status
    List<Complaint> findByDepartmentIdAndStatusOrderByCreatedTimeDesc(Long departmentId, ComplaintStatus status);
    
    // Find unassigned complaints in a department (for dept head to assign)
    List<Complaint> findByDepartmentIdAndStaffIsNullOrderByCreatedTimeDesc(Long departmentId);
    
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
    
    // ==================== COUNT QUERIES (for stats) ====================
    
    long countByCitizenUserId(Long citizenId);
    
    long countByCitizenUserIdAndStatus(Long citizenId, ComplaintStatus status);
    
    long countByStaffUserId(Long staffId);
    
    long countByStaffUserIdAndStatus(Long staffId, ComplaintStatus status);
    
    long countByDepartmentId(Long departmentId);
    
    long countByDepartmentIdAndStatus(Long departmentId, ComplaintStatus status);
    
    long countByStatus(ComplaintStatus status);
    
    long countByEscalationLevelGreaterThan(int level);
}
