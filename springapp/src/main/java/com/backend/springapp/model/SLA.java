package com.backend.springapp.model;

import com.backend.springapp.enums.Priority;

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
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * This is the "rulebook" that AI must follow:
 * - AI classifies complaint → gets Category
 * - System looks up SLAConfig for that Category
 * - SLAConfig tells: department, deadline, base priority
 * - AI can UPGRADE priority, but can't ignore SLA rules
 * 
 * Escalation days are system-wide constants (1, 3, 5 days after SLA breach)
 */
@Entity
@Table(name = "sla_config")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SLA {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "category_id", unique = true, nullable = false)
    private Category category;

    @Column(nullable = false)
    private Integer slaDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority basePriority;

    @ManyToOne
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    public SLA(Category category, Integer slaDays, Priority basePriority, Department department) {
        this.category = category;
        this.slaDays = slaDays;
        this.basePriority = basePriority;
        this.department = department;
    }
}
