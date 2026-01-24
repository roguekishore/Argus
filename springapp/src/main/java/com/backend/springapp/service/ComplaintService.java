package com.backend.springapp.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.Department;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.DepartmentRepository;
import com.backend.springapp.repository.UserRepository;

@Service
@Transactional
public class ComplaintService {
    
    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    /**
     * Create a new complaint (filed by citizen)
     * Initially: status = FILED, no department, no staff assigned
     * Department will be assigned later by AI
     * Staff will be assigned later by department head
     */
    public Complaint createComplaint(Complaint complaint, Long citizenId) {
        if (!userRepository.existsById(citizenId)) {
            throw new ResourceNotFoundException("Citizen not found with id: " + citizenId);
        }
        
        complaint.setCitizenId(citizenId);
        complaint.setStatus(ComplaintStatus.FILED);
        complaint.setDepartmentId(null);
        complaint.setStaffId(null);
        
        complaint.setStartTime(null);
        complaint.setUpdatedTime(null);
        complaint.setResolvedTime(null);
        complaint.setClosedTime(null);
        complaint.setCitizenSatisfaction(null);
        
        return complaintRepository.save(complaint);
    }

    @Transactional(readOnly = true)
    public Complaint getComplaintById(Long complaintId) {
        return complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
    }

    @Transactional(readOnly = true)
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }
    
    public Complaint updateComplaint(Long complaintId, Complaint updatedComplaint) {
        Complaint existingComplaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        if (updatedComplaint.getTitle() != null) {
            existingComplaint.setTitle(updatedComplaint.getTitle());
        }
        if (updatedComplaint.getDescription() != null) {
            existingComplaint.setDescription(updatedComplaint.getDescription());
        }
        if (updatedComplaint.getLocation() != null) {
            existingComplaint.setLocation(updatedComplaint.getLocation());
        }
        if (updatedComplaint.getStatus() != null) {
            existingComplaint.setStatus(updatedComplaint.getStatus());
        }
        existingComplaint.setUpdatedTime(LocalDateTime.now());
        
        return complaintRepository.save(existingComplaint);
    }

    public void deleteComplaint(Long complaintId) {
        if (!complaintRepository.existsById(complaintId)) {
            throw new ResourceNotFoundException("Complaint not found with id: " + complaintId);
        }
        complaintRepository.deleteById(complaintId);
    }

    // assign department to complaint by department name(by AI)
    public Complaint assignDepartmentByName(Long complaintId, String departmentName) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        Department department = departmentRepository.findByName(departmentName)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found with name: " + departmentName));
        
        complaint.setDepartmentId(department.getId());
        complaint.setUpdatedTime(LocalDateTime.now());
        
        return complaintRepository.save(complaint);
    }

    // assign staff to complaint (by department head)
    public Complaint assignStaff(Long complaintId, Long staffId) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        
        if (!userRepository.existsById(staffId)) {
            throw new ResourceNotFoundException("Staff not found with id: " + staffId);
        }
        
        complaint.setStaffId(staffId);
        complaint.setStatus(ComplaintStatus.OPEN);
        complaint.setStartTime(LocalDateTime.now());
        complaint.setUpdatedTime(LocalDateTime.now());
        
        return complaintRepository.save(complaint);
    }
}
