# Accessibility Audit & WCAG 2.1 AA Compliance — Lifeline-Core v3

This document details accessibility guidelines, automated audit checks, and keyboard navigation standards implemented in **Lifeline-Core v3**.

---

## 1. WCAG 2.1 AA Accessibility Standards

| Criteria | Standard | Implementation in Lifeline-Core v3 | Verified |
| :--- | :--- | :--- | :---: |
| **1.4.3 Contrast** | Minimum $4.5:1$ contrast ratio for regular text; $3:1$ for large text and UI boundaries. | All typography uses slate-100 on slate-900 ($>11:1$ contrast) or slate-400 on slate-900 ($>5.2:1$ contrast). Semantic badges use high-contrast dark fills with distinct text. | **YES** |
| **2.1.1 Keyboard** | All interactive controls accessible via keyboard alone (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`). | Radix UI primitives and custom buttons provide complete keyboard navigation. Modals trap focus and close on `Esc`. | **YES** |
| **2.4.7 Focus Visible**| Visible focus indicators on all interactive elements. | Custom Tailwind `focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none` on every button, input, and link. | **YES** |
| **3.3.1 Error Identification** | Input errors identified and described in text. | Form inputs render `aria-invalid="true"`, with explicit red error descriptions beneath the field. | **YES** |
| **4.1.2 Name, Role, Value** | Semantic HTML tags or ARIA attributes for custom widgets. | Tables use `<thead>`, `<tbody>`, `<th> scope="col"`. Dialogs use `role="dialog" aria-modal="true"`. Alerts use `role="alert"`. | **YES** |
| **2.3.3 Animation** | Respect `prefers-reduced-motion`. | Animations (e.g. pulse, spin) are scoped with `@media (prefers-reduced-motion: reduce) { animation: none !important; }`. | **YES** |

---

## 2. Keyboard Navigation Testing Matrix

1. **Global Navigation:** `Tab` moves through top navigation links in logical order; `Enter` activates route.
2. **Data Tables:** Column headers support keyboard sorting (`Enter`); pagination buttons support `Space`/`Enter`.
3. **Modal Dialogs:** Opening a modal automatically focuses the first focusable element; `Tab` cycles within the modal; `Esc` cancels and closes the modal, restoring focus to the trigger.
4. **Leaflet Map Accessible Alternative:** Every map view includes an accessible tabular list view immediately below the map, ensuring screen-reader users and non-mouse operators can inspect all facilities.
