# Final review fix report

## Scope and outcome

Base commit: `dbf9f70`

This wave resolves the final review findings for OAuth/bootstrap concurrency,
atomic OAuth completion, committed regression coverage, and Certification
status-check error classification.

Changed source and test files:

- `src/auth/authOperationCoordinator.js`
- `src/auth/authOperationCoordinator.test.js`
- `src/auth/AuthContext.jsx`
- `src/pages/Login/KakaoCallback.jsx`
- `src/pages/Certification/Certification.jsx`

## Root-cause analysis

`AuthContext` previously let four independent paths mutate authentication
state:

1. the provider bootstrap `getCurrentUser()`
2. `login(accessToken)`
3. `refreshCurrentUser()`
4. auth-expired/token-refreshed window events emitted by the API interceptor

The Kakao callback stored its token and marked authentication true before user
validation. At the same time, a provider bootstrap could still be using an old
token or refresh cookie. A slower bootstrap result could commit stale user
state after OAuth completion, and a bootstrap refresh failure could remove the
new token through the interceptor. When the callback began before the provider
effect, the later bootstrap could still start and create the same race.

Certification's `isRequested` refresh was inside the outer submission
`try/catch`, so a read-only status-check failure was logged and displayed as a
new certification submission failure.

## Implementation

### Auth operation coordinator

Added a framework-independent coordinator with injected token, current-user,
and state-commit dependencies.

- A monotonically increasing operation version invalidates stale bootstrap
  commits.
- An in-flight bootstrap promise is a barrier. `completeLogin()` waits for it
  to settle before installing the OAuth token, ensuring any interceptor-driven
  cleanup for that bootstrap finishes first.
- `hasLoginStarted` is set synchronously before the first await, so a provider
  bootstrap that starts after OAuth completion has begun is skipped.
- Auth-expired and token-refreshed events are ignored while login completion is
  active. This prevents events caused by the stale bootstrap or login
  validation request from partially committing auth state.
- OAuth success requires a non-null current user.
- Validation failure removes the new token, commits unauthenticated/checking
  false state, and rethrows the original failure.

### AuthContext and Kakao callback

`AuthContext` now stores `currentUser`, `isAuthenticated`, and
`isCheckingAuth` in one state object. Coordinator success and failure each use
one state update, so the three fields commit atomically.

The context exposes `completeLogin(accessToken)` and no longer exposes the
partial `login(accessToken)` operation. `KakaoCallback` now awaits only
`completeLogin(accessToken)` before navigating to `/entry`.

Existing `refreshCurrentUser()` and logout behavior remain available for the
accepted service-flow pages. No route guard, dependency, or service-flow policy
was changed.

### Certification

The `isRequested` status refresh now has its own catch:

- log label: `인증 상태 확인 실패`
- localized message:
  `인증 상태를 확인하지 못했어요. 잠시 후 다시 시도해주세요.`
- no upload/submission failure log
- no navigation on failure

The server-driven certification/session guard and all existing upload behavior
remain unchanged.

## TDD evidence

The coordinator tests use Node's built-in test runner, dependency injection,
and deferred promises. They perform no network calls.

### RED

The test file was created before the production module.

Command:

```powershell
node --test src/auth/authOperationCoordinator.test.js
```

Exit code: `1`

Verbatim failure excerpt:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Projects\Yulgok\client\src\auth\authOperationCoordinator.js' imported from C:\Projects\Yulgok\client\src\auth\authOperationCoordinator.test.js
Node.js v25.9.0
✖ src\auth\authOperationCoordinator.test.js
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
```

The failure was the expected missing production contract, not a syntax or test
setup failure.

### GREEN

After adding the minimal coordinator:

```powershell
node --test src/auth/authOperationCoordinator.test.js
```

Exit code: `0`

Output:

```text
✔ stale bootstrap completion and events cannot commit over a newer login
✔ login waits for an in-flight bootstrap before installing and validating its token
✔ failed user validation removes the new token, clears auth state, and rejects
✔ validation errors are rethrown after login rollback
✔ bootstrap cannot start after login completion has begun
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

The committed tests demonstrate:

- stale bootstrap success and stale auth events cannot commit over login
- the OAuth token is not installed or validated until an in-flight bootstrap
  settles
- null-user and thrown validation failures roll back and reject
- a bootstrap cannot start after login completion begins

## Final verification

All commands below were run against the final source state.

### New coordinator tests plus retained service-flow test

Command:

```powershell
node --test src/auth/authOperationCoordinator.test.js src/auth/serviceFlow.test.js
```

Exit code: `0`

Output:

```text
✔ stale bootstrap completion and events cannot commit over a newer login (1.3307ms)
✔ login waits for an in-flight bootstrap before installing and validating its token (0.5104ms)
✔ failed user validation removes the new token, clears auth state, and rejects (0.2323ms)
✔ validation errors are rethrown after login rollback (0.8566ms)
✔ bootstrap cannot start after login completion has begun (0.1908ms)
✔ service flow maps users to the correct stages, destinations, and certified access (0.7521ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 80.8139
```

### Focused ESLint

Command:

```powershell
npm.cmd exec eslint -- src/auth/authOperationCoordinator.js src/auth/authOperationCoordinator.test.js src/auth/AuthContext.jsx src/pages/Login/KakaoCallback.jsx src/pages/Certification/Certification.jsx
```

Exit code: `0`; no stdout or warnings.

### Full lint

Command:

```powershell
npm.cmd run lint
```

Exit code: `0`

Output:

```text
> client@0.0.0 lint
> eslint .
```

### Production build

Command:

```powershell
npm.cmd run build
```

Exit code: `0`

Output:

```text
> client@0.0.0 build
> vite build

vite v8.1.3 building client environment for production...
transforming...✓ 201 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                      1.04 kB │ gzip:   0.47 kB
dist/assets/index-BZvwNXgz.css      61.67 kB │ gzip:  12.28 kB
dist/assets/stomp.umd-BKthLXcZ.js   22.58 kB │ gzip:   6.49 kB
dist/assets/entry-DUNKMToB.js       44.08 kB │ gzip:  14.15 kB
dist/assets/index-CZbz1JnR.js      412.30 kB │ gzip: 127.20 kB

✓ built in 244ms
```

### Whitespace check

Command:

```powershell
git diff --check
```

Exit code: `0`; no whitespace errors. Git printed only existing
LF-to-CRLF working-copy notices for the three modified JSX files.

## Requirements self-review

| Requirement | Evidence |
| --- | --- |
| Invalidate stale bootstrap commits | operation version and stale completion/event regression test |
| Wait for an existing bootstrap before storing OAuth token | bootstrap barrier and explicit ordering test |
| Prevent bootstrap when OAuth starts first | synchronous login-start marker and dedicated regression test |
| Store token, validate non-null user, commit atomically | coordinator validation plus one AuthContext state update |
| Roll back token/auth/checking state and rethrow | null and thrown-error regression tests |
| Callback uses only `completeLogin` | `KakaoCallback.jsx` integration |
| Retain service-flow behavior | unchanged policy plus retained test passing |
| No network dependency or third-party package | pure Node tests; `package.json` unchanged |
| No global route guard | routing files unchanged |
| Preserve certification/session guard | shared policy and guard behavior unchanged |
| Distinguish REQUESTED status-check failures | branch-local catch and localized message |

## Independent review

A separate reviewer inspected the final source diff and ran the coordinator
plus service-flow tests, focused ESLint, full lint, and `git diff --check`.
It found no Critical or Important code defects. Its only readiness findings
were to run the production build, create this report, and stage the two new
coordinator files; those items are addressed in this wave.

## Remaining concern

The repository has no rendered React component test harness, so the
Certification message branch is verified by code review, focused/full ESLint,
and the production build rather than a rendered interaction test. Live Kakao
and backend-driven browser scenarios were not run because they require the
external OAuth/backend environment; the concurrency policy itself is covered
deterministically with deferred promises.
