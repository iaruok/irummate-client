# Task 1: Pure auth service-flow policy report

## Delivered

- Created `src/auth/serviceFlow.js` with the exported `SERVICE_STAGES`, `getServiceStage(user)`, `getServiceDestination(user)`, and `canAccessCertifiedRoutes(user)` API.
- Created table-driven Node built-in tests in `src/auth/serviceFlow.test.js` for every required routing and certified-access scenario.
- Left `src/auth/certificationAccess.js` unchanged.

## Policy implemented

`getServiceStage` applies the required precedence in this exact order:

1. Missing user and unknown roles route to `LOGIN`.
2. `ADMIN` routes to `ADMIN`.
3. `USER` with `status === 'ACTIVE'` routes to `CERTIFIED`, before checking survey status.
4. `GUEST` routes to `CONSENT`.
5. Remaining `USER` records with `surveyCompleted !== true` route to `SURVEY`.
6. Only after confirming a survey-complete `USER`, `certificationStatus === 'APPROVED'` routes to `CERTIFIED`.
7. Other survey-complete users route to `CERTIFICATION`.

Destinations are mapped from stages: `/login`, `/admin`, `/entry`, `/surveys/sleep`, `/certification`, and `/matching`.

`canAccessCertifiedRoutes` returns true only when the policy resolves to `CERTIFIED`: an active user or a survey-complete user with approved certification.

## TDD evidence

### RED

Command:

```powershell
node --test src/auth/serviceFlow.test.js
```

Before creating the implementation, the test failed as expected with `ERR_MODULE_NOT_FOUND` for `src/auth/serviceFlow.js`. This confirms the test exercised the new module contract rather than existing behavior.

### GREEN

Command:

```powershell
node --test src/auth/serviceFlow.test.js
```

After the minimal implementation was added, the command passed: 1 test, 1 pass, 0 failures. The table covers missing users, admin, guest, survey incomplete, requested/rejected/approved certification, active users, unknown roles, destinations, and certified-route access.

## Verification and self-review

- `node --test src/auth/serviceFlow.test.js`: passed (1/1).
- `npm.cmd run lint`: passed.
- `git diff --check`: passed.
- Reviewed ordering against the brief. `certificationStatus` is not evaluated until the record is both a `USER` and survey complete.
- Confirmed no production file outside `src/auth/serviceFlow.js` was changed for this task, and `src/auth/certificationAccess.js` was not modified.

## Notes

PowerShell blocked the `npm.ps1` shim under the machine execution policy, so lint was run successfully through `npm.cmd` instead.
