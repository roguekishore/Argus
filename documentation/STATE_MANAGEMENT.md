user - file a complaint, see the complaints

admin - staffs & heads, departments, categories, slas, complaints, escalations
superadmin - users, departments, categories, slas, complaints, escalations
municipal - staffs & heads, departments, categories, slas, complaints, escalations
dept head - staffs, department complaints, escalations
staff - assigned complaints


States:
| State           | Meaning                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| **FILED**       | Complaint submitted by citizen. Routing, priority, and SLA are being determined. |
| **IN_PROGRESS** | Complaint is assigned to a department. SLA is active and resolution is expected. |
| **RESOLVED**    | Department has marked the complaint as addressed. Awaiting citizen confirmation. |
| **CLOSED**      | Citizen accepted the resolution or auto-closed after timeout. Terminal state.    |
| **CANCELLED**   | Complaint withdrawn, duplicate, or invalid. Terminal state.                      |

1. Allowed State Transitions
- FILED -> IN_PROGRESS ✓ (when ai assigns departments)
- FILED → CLOSED ✗ (must go through RESOLVED and wait for confirmation from citizen)
- IN_PROGRESS → FILED ✗ (no rollback)
- IN_PROGRESS → RESOLVED ✓
- RESOLVED → CLOSED ✓
- Any state → CANCELLED ✓ (if citizen requests or duplicate)

2. State Transition Rules
FILED
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED

FILED / IN_PROGRESS / RESOLVED → CANCELLED

Escalation does not change state

3.State Transition Permissions
| Transition                 | Who Can Trigger               | Reason                                   |
| -------------------------- | ----------------------------- | ---------------------------------------- |
| **FILED → IN_PROGRESS**    | System (AI / Workflow Engine) | Institutional acceptance; SLA start      |
| **IN_PROGRESS → RESOLVED** | Staff, Department Head        | Operational resolution                   |
| **RESOLVED → CLOSED**      | Citizen, System (auto-close)  | Citizen acceptance or timeout            |
| **→ CANCELLED**            | Citizen, Admin                | Withdrawal, duplicate, invalid complaint |


4.Role based State Transition Matrix
| Transition             | Citizen | Staff | Dept Head | Commissioner | Admin | Super Admin | System |
| ---------------------- | ------- | ----- | --------- | ------------ | ----- | ----------- | ------ |
| FILED → IN_PROGRESS    | ❌       | ❌     | ❌         | ❌            | ❌     | ❌           | ✅      |
| IN_PROGRESS → RESOLVED | ❌       | ✅     | ✅         | ❌            | ⚠️    | ❌           | ❌      |
| RESOLVED → CLOSED      | ✅       | ❌     | ❌         | ❌            | ❌     | ❌           | ✅      |
| → CANCELLED            | ✅       | ❌     | ❌         | ❌            | ✅     | ⚠️          | ❌      |
