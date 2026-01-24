package com.backend.springapp.dto.response;

import java.time.LocalDateTime;

import com.backend.springapp.enums.UserType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDTO {
    
    private Long userId;
    private String name;
    private String mobile;
    private String email;

    private UserType userType;

    private Long deptId;
    
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
}
