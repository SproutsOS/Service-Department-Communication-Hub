# Profitability Ledger Employee Roster Scope & Persistence Plan

Restricts the Profitability Ledger strictly to employees manually entered by the user within the Profitability Ledger itself, disabling automatic staff directory (`users`) synchronization, and cleanly propagating user-entered employees across weekly pay periods.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices from User Feedback:**
> 1. **No Automatic Employee Roster Sync**: The Profitability Ledger will **NOT** automatically pull or sync all employees from the main shop staff directory (`users`). Only employees explicitly added inside the Profitability Ledger will appear.
> 2. **Roster Propagation**: Employees manually added to the Profitability Ledger will be present on all weeks in the ledger and automatically rolled over to new weeks created moving forward.
> 3. **Independent Weekly Figures**: Existing weekly figures (actual hours, flagged hours, labor sales) for previously saved weeks will remain completely intact when new employees are added to the ledger.

---

## 1. Overview & Core Concept

The Employee Profitability Ledger is an independent accounting spreadsheet for tracking actual hours vs billable flagged hours, rate of pay, labor sales, and gross profit.

Previously, an automatic background process synced all staff members from the main shop employee roster (`users`) into the Profitability Ledger. This plan removes all automatic directory syncing so that only the specific employees entered by the user appear in the Profitability Ledger spreadsheet.

---

## 2. Technical Architecture & Component Changes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Actions / Input                            │
│   (Click "+ Add Employee Row" or edit employee name/pay type in sheet)  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Employee Profitability Ledger Component                  │
│  - Reads/Writes ProfitabilityWeek[] from state                         │
│  - Does NOT auto-pull from AppContext `users` directory                │
│  - Only processes user-entered EmployeeProfitabilityRow items          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   LocalStorage & Cloud Persistence                     │
│  - LocalStorage: `dealership_employee_profitability_weeks_v4_wed_tue`  │
│  - Firestore: `settings/profitabilityLedger`                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Changes:
1. **Remove Automatic Staff Directory Sync (`syncStaffRosterToWeeks`)**:
   - Strip out any auto-population logic that fetches from `AppContext` `users` or `INITIAL_USERS`.
   - Ensure the Profitability Ledger relies strictly on user-created entries in `weeks`.

2. **Clean Manual Roster Management**:
   - `handleAddRow`: Adds a new employee row to the current week and propagates that employee name/role/rate to all other weeks in the ledger (with default 40h hours / 0 sales for other weeks).
   - `handleUpdateRow`: Updates the employee's details (name, pay rate, pay type, hours, sales) for the active week.
   - `handleDeleteRow`: Removes an employee row from the active week.
   - `handleCreateNewWeek`: Creates a new Wednesday-to-Tuesday week pre-populated with all user-entered employees from the ledger.

3. **Persistent Cloud & Local Save**:
   - Save every roster modification directly to `localStorage` and `syncProfitabilityWeeksToCloud` (Firestore `settings/profitabilityLedger`).

---

## 3. Implementation Steps

1. **`src/utils/employeeProfitabilityCalculations.ts`**:
   - Update `ensureMasterRosterOnAllWeeks` to operate solely on user-entered `EmployeeProfitabilityRow` items in `weeksList` (removing the `usersList` parameter and auto-sync).
   - Deprecate `syncStaffRosterToWeeks`.

2. **`src/components/EmployeeProfitabilityLedger.tsx`**:
   - Remove the `useEffect` that listened to `users` and auto-populated staff members.
   - Update `saveWeeks` to clean and persist user-entered rows without pulling from `users`.
   - Keep "+ Add Employee Row", "+ New Week", and CSV/Print controls.

3. **Verification**:
   - Run `lint_applet` and `compile_applet` to ensure zero compilation or syntax errors.
