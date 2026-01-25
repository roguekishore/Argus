package com.backend.springapp.dto.response;

import com.backend.springapp.enums.Priority;
import com.backend.springapp.model.SLA;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * SLA Response DTO
 * Avoids circular references by flattening relationships
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SLAResponseDTO {
    
    private Long id;
    private Integer slaDays;
    private Priority basePriority;
    
    // Flattened category info
    private CategoryInfo category;
    
    // Flattened department info
    private DepartmentInfo department;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryInfo {
        private Long id;
        private String name;
        private String description;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentInfo {
        private Long id;
        private String name;
    }
    
    /**
     * Convert SLA entity to DTO
     */
    public static SLAResponseDTO fromEntity(SLA sla) {
        if (sla == null) return null;
        
        CategoryInfo categoryInfo = null;
        if (sla.getCategory() != null) {
            categoryInfo = new CategoryInfo(
                sla.getCategory().getId(),
                sla.getCategory().getName(),
                sla.getCategory().getDescription()
            );
        }
        
        DepartmentInfo departmentInfo = null;
        if (sla.getDepartment() != null) {
            departmentInfo = new DepartmentInfo(
                sla.getDepartment().getId(),
                sla.getDepartment().getName()
            );
        }
        
        return SLAResponseDTO.builder()
            .id(sla.getId())
            .slaDays(sla.getSlaDays())
            .basePriority(sla.getBasePriority())
            .category(categoryInfo)
            .department(departmentInfo)
            .build();
    }
}
