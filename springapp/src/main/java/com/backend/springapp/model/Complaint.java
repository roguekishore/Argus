package com.backend.springapp.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.annotation.Generated;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "complaints")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long complaintId;

    private String title;
    private String description;
    private String location;

    @Enumerated(EnumType.STRING)
    private ComplaintStatus status;

    @Enumerated(EnumType.STRING)
    private Priority priority;

    @Column(name = "citizen_id")
    private Long citizenId;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "citizen_id", insertable = false, updatable = false)
    private User citizen;

    @Column(name = "staff_id")
    private Long staffId;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "staff_id", insertable = false, updatable = false)
    private User staff;

    @Column(name = "department_id")
    private Long departmentId;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "department_id", insertable = false, updatable = false)
    private Department department;

    @CreationTimestamp
    private LocalDateTime createdTime;

    private LocalDateTime startTime;
    private LocalDateTime updatedTime;
    private LocalDateTime resolvedTime;
    private LocalDateTime closedTime;

    private Integer citizenSatisfaction;
}
