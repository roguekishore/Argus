package com.backend.springapp.dto.request;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ============================================================
 * ⚠️  TEST-ONLY DTO - NOT FOR PRODUCTION USE  ⚠️
 * ============================================================
 * 
 * Request DTO for overriding complaint filed date (createdTime).
 * 
 * PURPOSE:
 * This DTO exists SOLELY to support escalation testing scenarios.
 * Since @CreationTimestamp automatically sets createdTime on insert,
 * we need a way to backdate complaints to simulate overdue conditions.
 * 
 * USAGE SCENARIO:
 * 1. Create a complaint (gets today's date automatically)
 * 2. Use this endpoint to backdate createdTime to 10 days ago
 * 3. Trigger escalation scheduler
 * 4. Verify complaint escalates to appropriate level
 * 
 * SECURITY NOTE:
 * In production, this endpoint should be:
 * - Disabled entirely, OR
 * - Restricted to dev/test profiles, OR
 * - Protected by admin-only authentication
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateFiledDateRequest {

    /**
     * The new filed date (createdTime) to set.
     * Must be in the past or present - cannot file a complaint in the future.
     */
    @NotNull(message = "filedDate is required")
    @PastOrPresent(message = "filedDate must be in the past or present")
    private LocalDateTime filedDate;

    /**
     * Whether to recalculate slaDeadline based on the new filedDate.
     * 
     * If true: slaDeadline = filedDate + slaDaysAssigned
     * If false: slaDeadline remains unchanged
     * 
     * Default: true (recalculate)
     * 
     * WHY this option exists:
     * - true: Simulates a complaint that was filed on the backdated date
     * - false: Allows testing edge cases where deadline was manually adjusted
     */
    private Boolean recalculateSlaDeadline = true;
}
