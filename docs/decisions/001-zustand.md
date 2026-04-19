# DD-001: Use zustand for client state management

**Date**: 2026-03-01  
**Status**: Accepted

---

## Context

volta-auth-console needs to share authentication state (user, tenants, authenticated flag) across all 12 pages without prop drilling. Options considered:

1. React Context + useReducer
2. Redux Toolkit
3. zustand
4. Jotai

---

## Decision

Use **zustand v5**.

---

## Rationale

| Criterion | React Context | Redux Toolkit | zustand | Jotai |
|-----------|--------------|---------------|---------|-------|
| Bundle size | 0 (built-in) | ~20 KB | ~3 KB | ~3 KB |
| Boilerplate | Low | High | Very low | Low |
| DevTools | None | Excellent | Good | Limited |
| React 19 compat | Yes | Yes | Yes | Yes |
| tramli integration | Manual | Manual | Simple setter | Simple setter |

zustand wins on simplicity-to-power ratio. The auth store has exactly one slice (`authStore`) with four fields. Redux Toolkit would be over-engineered; React Context would cause unnecessary re-renders on every auth state change.

---

## Integration with tramli

`useAuthFlow` (wrapping `sessionResumeDefinition`) writes into zustand on flow completion:

```js
// useAuthFlow.js
const { setAuth } = useAuthStore();

onTerminal('AUTHENTICATED', (ctx) => {
  setAuth({
    user: ctx.get(ResumeUser),
    tenants: ctx.get(ResumeTenants),
    authenticated: true,
    loading: false,
  });
});
```

tramli is the source of truth for the auth check. zustand is only the React-accessible store.

---

## Known issue

`zustand` is currently listed in `devDependencies` instead of `dependencies` in `package.json`. This is a misclassification — it works because Vite bundles everything, but should be corrected before any package.json consumer relies on it.

---

## Consequences

- Simple, low-overhead state sharing across all pages
- tramli remains authoritative; zustand is a thin React bridge
- Must fix `devDependencies` misclassification before containerizing
