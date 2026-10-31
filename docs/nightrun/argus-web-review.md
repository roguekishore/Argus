# Web Migration Review: ARGUS reactapp (Phase R)

**Review Target:** `ARGUS`, branch `chore/stack-web`  
**Baseline Commit:** `bc629003623e73f6c782a4affd1902d8a545488e`  
**Review Date:** 2026-10-31  
**Spec Compliance:** SPEC Sections 2, 6, and 7  

---

## 1. Executive Summary & Verdict

The migration of `reactapp` from Create React App (CRA 5) / Webpack / Tailwind 3 / React 19.2 to Vite 8.3 / Vitest 5 / Tailwind 4.3 / React 19.3 is complete, stable, and conforms to all frozen requirements in `SPEC.md`.

- **Web Gate Verification:** `bash ~/apps-gates/web-gate.sh reactapp` passes cleanly with clean `npm ci`, production build (`build/index.html`), and all 3 baseline routes (`/`, `/login`, `/signup`) verified in Chromium with matching text length and zero uncaught errors.
- **Visual Inspection:** Visual comparison between baseline screenshots (`../baseline/reactapp/shots/*.png`) and post-migration screenshots (`../gate-reports/reactapp-after/*.png`) verified:
  - Landing page (`_.png`): visually identical (<0.6% RMSE diff due to continuous ticker / keyframe animations).
  - Form routes (`_login.png`, `_signup.png`): spacing between form labels and inputs restored via Tailwind 4 compatibility base CSS for `label { display: inline-block; }` and `--default-ring-width: 3px;`.
- **Scope Compliance (G7):** `git diff --name-only $(cat ../baseline/sha)` touches only files within `reactapp/` and documentation within `docs/nightrun/`. Scope check `bash ~/apps-gates/web-gate.sh - scope` passes.

---

## 2. Review Findings by Category

| # | Category | Severity | File:Line | Finding & Rationale | Action Taken |
|---|---|---|---|---|---|
| 1 | Tailwind 4 Visual Fidelity | Medium | `reactapp/src/index.css:104` | In Tailwind 4, `@utility space-y-*` was redesigned from adjacent sibling `margin-top` to `:not(:last-child) { margin-block-end: ... }`. When form containers (`div.space-y-2`) contain `<Label>` and `<Input>` / `<div className="relative">`, `margin-block-end` had no effect on default inline `<label>` elements (`display: inline`), causing label-to-input gap to collapse from 8px to 0px across Login and Signup cards. | Fixed: added `label { display: inline-block; }` and `--default-ring-width: 3px;` in compatibility styles in `src/index.css`. Spacing restored; card heights closely align with baseline. |
| 2 | Environment Variables | Info | `reactapp/src/services/api/apiClient.js:14,152,161,170`, `reactapp/src/services/authService.js:192`, `reactapp/src/ChatBot.jsx:4`, `reactapp/src/components/ChatBot.jsx:8` | Verified against SPEC §6.1. All occurrences of `process.env.REACT_APP_API_URL` and `process.env.NODE_ENV` were migrated to `import.meta.env.REACT_APP_API_URL` and `import.meta.env.MODE`. `vite.config.js` sets `envPrefix: ['VITE_', 'REACT_APP_']` to preserve runtime env passing. Zero occurrences of `process.env` remain in `reactapp/src`. | Verified compliant. |
| 3 | Assets and Public Paths | Info | `reactapp/index.html:1-34`, `reactapp/public/` | Verified against SPEC §6.1. `public/index.html` was moved to app root `/index.html`. `%PUBLIC_URL%` tokens replaced with root-relative paths (`/favicon.ico`, `/logo192.png`, `/manifest.json`). Module entry script `<script type="module" src="/src/index.jsx"></script>` added. Static assets in `reactapp/public/` (`_redirects`, `favicon.ico`, `logo.svg`, `logo192.png`, `logo512.png`, `manifest.json`, `robots.txt`) remain in `public/` and copy cleanly to `build/`. | Verified compliant. |
| 4 | Routing and Base Path | Info | `reactapp/vite.config.js:12-18`, `reactapp/src/router/AppRouter.jsx` | Verified against SPEC §6.1. `build.outDir` is set to `'build'`, `server.port` is set to `3000`. Base path is `/`. Chromium route check (`../apps-gates/routes.mjs`) confirms all routes in `../baseline/reactapp/routes.txt` (`/`, `/login`, `/signup`) render with matching text length (2139, 335, 170 chars) and 0 uncaught errors. | Verified compliant. |
| 5 | Test Suite Integrity | Info | `reactapp/src/App.test.jsx:1-8`, `reactapp/src/setupTests.js:5-20` | Verified against SPEC §2.5 and §6.2. No tests were deleted, weakened, skipped, or marked `@Disabled`. `src/App.test.js` renamed to `src/App.test.jsx`. `setupTests.js` updated to import `@testing-library/jest-dom/vitest` and mock `window.matchMedia`. Baseline test failure (`Unable to find an element with the text: /learn react/i`) matches baseline log exactly; no tests were altered. | Verified compliant. |
| 6 | Dependencies and Lockfile | Info | `reactapp/package.json:16-40`, `reactapp/package-lock.json` | Verified against SPEC §1, §2.6, and §6.5. `package-lock.json` is committed and installs cleanly with `npm ci --no-audit --no-fund`. Target versions satisfied: `react` `^19.3.1`, `react-dom` `^19.3.1`, `vite` `^8.3.5`, `@vitejs/plugin-react` `^6.1.2`, `tailwindcss` `^4.3.3`, `@tailwindcss/vite` `^4.3.3`, `tw-animate-css` `^1.4.0`, `vitest` `^5.0.5`, `jsdom` `^30.1.3`. `react-scripts`, `postcss`, and `autoprefixer` completely removed. | Verified compliant. |

---

## 3. Detailed Review Against SPEC Sections 2, 6, and 7

### SPEC Section 2: Hard Rules Compliance
1. **Rule 1 (Work boundary):** Work strictly confined to `reactapp/**` and `docs/nightrun/**`. No files touched in baseline, gate scripts, or outside the repo.
2. **Rule 2 (Databases & AWS):** No AWS credentials, SDK calls, or instance metadata accessed.
3. **Rule 3 (Preservation of behavior):** No endpoint paths, request/response JSON shapes, status codes, or security rules modified.
4. **Rule 4 (Git hygiene):** No git commit, reset, checkout, stash, clean, rebase, or push executed.
5. **Rule 5 (Test preservation):** No tests weakened, skipped, deleted, or `@Disabled`.
6. **Rule 6 (Dependencies):** Only sanctioned migration dependencies added (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, `vitest`, `jsdom`).
7. **Rule 7 (Secrets):** No dummy secrets or credentials copied or logged.
8. **Rule 8 (Gate check):** Gate executed and verified before concluding.

### SPEC Section 6: Web CRA to Vite 8, Tailwind 4, React 19.3
1. **Vite 8:** `react-scripts` removed; `vite` 8.3.5 and `@vitejs/plugin-react` 6.1.2 installed; root `index.html` with entry module script; `.jsx` extensions applied; `vite.config.js` sets `build.outDir: 'build'`, `server.port: 3000`, `envPrefix: ['VITE_', 'REACT_APP_']`, `@` alias mapped to `src`.
2. **Tests:** Vitest 5.0.5 with jsdom environment, globals enabled, `setupTests.js` importing `@testing-library/jest-dom/vitest`.
3. **Tailwind 4:** Migrated to Tailwind 4.3.3 via `@tailwindcss/vite` plugin; PostCSS/autoprefixer and `tailwind.config.js` removed; `tw-animate-css` 1.4.0 replacing `tailwindcss-animate`; compatibility CSS added for border color, button cursor, placeholder color, ring width, and label display.
4. **React 19.3:** `react` and `react-dom` updated to `^19.3.1`.
5. **Lockfile:** `package-lock.json` committed and validated with `npm ci`.

### SPEC Section 7: Web: Other Items
- Not applicable to `argus-web` (no Next.js `nextapp` or VANTAGE `judge/`).

---

## 4. Verification Commands & Results

```bash
# 1. Scope check (G7)
bash ~/apps-gates/web-gate.sh - scope
# Output: GATE PASS [scope]

# 2. Web gate for reactapp
bash ~/apps-gates/web-gate.sh reactapp
# Output:
# ROUTE CHECK PASS: 3 routes
# GATE PASS [reactapp]

# 3. Final driver gate assertion
test -s docs/nightrun/argus-web-review.md && bash ~/apps-gates/web-gate.sh - scope
# Output: GATE PASS [scope] (exit code 0)
```
