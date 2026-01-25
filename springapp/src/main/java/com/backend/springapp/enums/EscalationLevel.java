package com.backend.springapp.enums;

/**
 * Escalation levels for grievance complaints.
 * 
 * Escalation is ORTHOGONAL to complaint status:
 * - Status tracks WHERE the complaint is in its lifecycle (FILED → CLOSED)
 * - EscalationLevel tracks WHO should be handling it based on SLA breach severity
 * 
 * Escalation can only INCREASE (L0 → L1 → L2), never decrease automatically.
 * This ensures accountability - once escalated to a higher authority, 
 * they remain responsible for oversight even if the complaint is eventually resolved.
 * 
 * Escalation Timeline (relative to SLA deadline):
 * - L0: Default assignment to Staff (within SLA)
 * - L1: SLA deadline + 1 day → escalate to Department Head
 * - L2: SLA deadline + 3 days → escalate to Municipal Commissioner
 */
public enum EscalationLevel {
    
    /**
     * Level 0: Staff level (default)
     * Complaint is within SLA or recently filed.
     * Handled by assigned staff member.
     */
    L0(0, "Staff", UserType.STAFF),
    
    /**
     * Level 1: Department Head
     * SLA breached by more than 1 day.
     * Requires department head oversight.
     */
    L1(1, "Department Head", UserType.DEPT_HEAD),
    
    /**
     * Level 2: Municipal Commissioner
     * SLA breached by more than 3 days.
     * Highest escalation level - requires commissioner attention.
     */
    L2(2, "Municipal Commissioner", UserType.MUNICIPAL_COMMISSIONER);

    private final int level;
    private final String displayName;
    private final UserType responsibleRole;

    EscalationLevel(int level, String displayName, UserType responsibleRole) {
        this.level = level;
        this.displayName = displayName;
        this.responsibleRole = responsibleRole;
    }

    public int getLevel() {
        return level;
    }

    public String getDisplayName() {
        return displayName;
    }

    public UserType getResponsibleRole() {
        return responsibleRole;
    }

    /**
     * Convert integer level to enum.
     * Useful when reading escalation_level from Complaint entity.
     */
    public static EscalationLevel fromLevel(int level) {
        for (EscalationLevel el : values()) {
            if (el.level == level) {
                return el;
            }
        }
        throw new IllegalArgumentException("Invalid escalation level: " + level);
    }

    /**
     * Check if this level is higher than another.
     * Used to enforce "escalation can only increase" rule.
     */
    public boolean isHigherThan(EscalationLevel other) {
        return this.level > other.level;
    }

    /**
     * Get the next escalation level, or null if already at max.
     */
    public EscalationLevel getNextLevel() {
        return switch (this) {
            case L0 -> L1;
            case L1 -> L2;
            case L2 -> null; // Already at highest level
        };
    }
}
