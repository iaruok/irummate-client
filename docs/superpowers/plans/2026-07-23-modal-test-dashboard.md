# Modal Test Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing public `/test` page into an interactive dashboard that exercises the common Modal API in a local browser.

**Architecture:** `Test.jsx` owns the active example, shared close options, and last interaction result. Three buttons open help, image-example, and confirmation modal variants while reusing the same `Modal`, `Modal.Footer`, and `Modal.Button` API.

**Tech Stack:** React 19, Tailwind CSS 4, common `Modal` compound component

## Global Constraints

- Modify only `src/pages/Test.jsx`.
- Preserve the user's existing `/test` route and `src/App.jsx` changes.
- Do not add image assets or call APIs.
- Use a CSS-rendered dormitory acceptance example with an accessible label.
- Show results for `overlay`, `escape`, `close-button`, `cancel`, and `confirm`.

---

### Task 1: Interactive modal test dashboard

**Files:**
- Modify: `src/pages/Test.jsx`

**Interfaces:**
- Consumes: named `Modal` export from `../components/Modal/index.js`
- Produces: default `Test` page component
- State: `activeModal: 'help' | 'image' | 'confirm' | null`
- State: `options: { closeOnOverlayClick, closeOnEscape, showCloseButton }`
- State: `lastResult: string`

- [ ] **Step 1: Replace the empty page with the dashboard**

Implement `src/pages/Test.jsx` with:

- three example launch cards
- three shared option checkboxes
- a last-result status panel
- help content long enough to test scrolling
- a CSS-rendered acceptance screenshot example
- help, image, and confirmation modal variants

Use `closeModal(result)` to update the status panel and close the active modal. Pass all shared options into each `Modal`.

- [ ] **Step 2: Run focused lint**

Run:

```bash
npx.cmd eslint src/pages/Test.jsx
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run complete static verification**

Run:

```bash
npm.cmd run lint
npm.cmd run build
```

Expected: both commands exit with code 0, and Vite produces a production bundle.

- [ ] **Step 4: Verify locally**

Run:

```bash
npm.cmd run dev
```

Open `/test` and verify:

- all three cards open their intended modal
- overlay, Escape, and X respect the shared checkboxes
- the status panel reports the exact interaction
- help content scrolls inside the viewport
- the sticky Footer remains reachable
- the image example adapts to mobile and desktop widths
- Tab and Shift+Tab remain inside the open modal

- [ ] **Step 5: Commit only the test page**

```bash
git add src/pages/Test.jsx
git commit -m "test: add common modal showcase page"
```

Do not stage `src/App.jsx`; it is an existing user change.
