package com.backend.springapp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.springapp.enums.UserType;
import com.backend.springapp.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByMobile(String mobile);
    
    boolean existsByEmail(String email);
    
    boolean existsByMobile(String mobile);

    //deptartment and user type based queries
    
    List<User> findByDeptId(Long deptId);
    
    List<User> findByUserType(UserType userType);
    
    List<User> findByDeptIdAndUserType(Long deptId, UserType userType);
    
    Optional<User> findFirstByDeptIdAndUserType(Long deptId, UserType userType);
}
