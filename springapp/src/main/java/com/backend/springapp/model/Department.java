package com.backend.springapp.model;

import java.util.List;

import com.backend.springapp.enums.UserType;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "departments")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Department {
    
    @Id
    private Long id;
    
    private String name;

    @OneToMany(mappedBy = "department")
    private List<User> departmentMembers;
    
    // Helper method to get department head
    public User getDepartmentHead() {
        if (departmentMembers == null) return null;
        return departmentMembers.stream()
            .filter(user -> user.getUserType() == UserType.DEPT_HEAD)
            .findFirst()
            .orElse(null);
    }
    
    // Helper method to get only staff members (excluding head)
    public List<User> getStaffMembers() {
        if (departmentMembers == null) return List.of();
        return departmentMembers.stream()
            .filter(user -> user.getUserType() == UserType.STAFF)
            .toList();
    }
}
