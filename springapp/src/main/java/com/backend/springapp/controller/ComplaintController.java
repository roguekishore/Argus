package com.backend.springapp.controller;

import com.backend.springapp.model.Complaint;
import com.backend.springapp.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    // Create a new complaint (filed by citizen)
    @PostMapping("/citizen/{citizenId}")
    public ResponseEntity<Complaint> createComplaint(@RequestBody Complaint complaint, @PathVariable Long citizenId) {
        Complaint created = complaintService.createComplaint(complaint, citizenId);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // Get complaint by ID
    @GetMapping("/{complaintId}")
    public ResponseEntity<Complaint> getComplaintById(@PathVariable Long complaintId) {
        Complaint complaint = complaintService.getComplaintById(complaintId);
        return ResponseEntity.ok(complaint);
    }

    // Get all complaints
    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        List<Complaint> complaints = complaintService.getAllComplaints();
        return ResponseEntity.ok(complaints);
    }

    // Update complaint
    @PutMapping("/{complaintId}")
    public ResponseEntity<Complaint> updateComplaint(@PathVariable Long complaintId, @RequestBody Complaint updatedComplaint) {
        Complaint updated = complaintService.updateComplaint(complaintId, updatedComplaint);
        return ResponseEntity.ok(updated);
    }

    // Delete complaint
    @DeleteMapping("/{complaintId}")
    public ResponseEntity<Void> deleteComplaint(@PathVariable Long complaintId) {
        complaintService.deleteComplaint(complaintId);
        return ResponseEntity.noContent().build();
    }

    // Assign department to complaint by department name
    @PutMapping("/{complaintId}/assign-department")
    public ResponseEntity<Complaint> assignDepartmentByName(@PathVariable Long complaintId, @RequestParam String departmentName) {
        Complaint updated = complaintService.assignDepartmentByName(complaintId, departmentName);
        return ResponseEntity.ok(updated);
    }

    // Assign staff to complaint (by department head)
    @PutMapping("/{complaintId}/assign-staff/{staffId}")
    public ResponseEntity<Complaint> assignStaff(@PathVariable Long complaintId, @PathVariable Long staffId) {
        Complaint updated = complaintService.assignStaff(complaintId, staffId);
        return ResponseEntity.ok(updated);
    }
}
