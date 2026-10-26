# Ethical Guardrails, Limitations & Safety Disclaimers — Lifeline-Core v2

This document provides a transparent, honest assessment of the safety boundaries, modeling assumptions, and clinical limitations of **Lifeline-Core v2**.

---

## 1. Safety Boundary & Clinical Disclaimer

> **MANDATORY SAFETY BOUNDARY:** Lifeline-Core v2 is an algorithmic research, academic demonstration, and simulation platform. It is **not** cleared by the US FDA, CE-marked, or certified under HIPAA, DISHA, or ISO 13485 for clinical medical use.

- **Do Not Deploy in Clinical Production:** This software must never be connected to real hospital emergency department management systems, deployed in active ambulance fleets, or used to make live triage allocations.
- **Do Not Ingest Real Patient Data:** Lifeline-Core v2 does not collect or process Protected Health Information (PHI) or Personally Identifiable Information (PII). All incident records are synthetically generated.
- **Academic Scope:** The project is designed exclusively for evaluation within an Advanced Data Structures & Algorithms (ADSA) context.

---

## 2. Modeling Simplifications & Known Ceilings

### A. Road Network Transit vs Real-World Traffic
- **Current Assumption:** The road router traverses a 24-node, 27-edge arterial graph using fixed corridor speeds ($40-60\text{ km/h}$).
- **Real-World Reality:** Real emergency transit times fluctuate wildly based on peak rush hours, construction blockages, weather conditions, emergency siren right-of-way compliance, and signal priority systems.
- **Upgrade Path:** Ingest live transit GTFS/OpenStreetMap traffic feeds or integration with localized traffic telemetry APIs.

### B. Stationary Poisson Walk-In Assumption
- **Current Assumption:** Hospital walk-in arrivals are modeled as a homogeneous stationary Poisson process with constant rate $\lambda_{walk}$.
- **Real-World Reality:** Hospital emergency departments experience pronounced diurnal surges (typically peaking between 18:00 and 22:00) and seasonal infection epidemic spikes (e.g. dengue or respiratory viruses).
- **Upgrade Path:** Non-homogeneous Poisson processes with time-varying intensity functions $\lambda(t)$ fitted to historical regional hospital admissions logs.

### C. Resource Homogeneity
- **Current Assumption:** Resources are modeled as discrete integer counters (e.g. `ICU-BED: 5`).
- **Real-World Reality:** An ICU bed cannot admit a patient without qualified 1:1 or 1:2 critical care nurses, respiratory therapists, compatible ventilators, oxygen supplies, and subspecialty physician availability (e.g. pediatric intensivists vs neuro-intensivists).
- **Upgrade Path:** Multi-dimensional resource constraints modeling nurse-to-patient staffing ratios and equipment bundles.

### D. Single-Facility Allocation vs Multi-Stage Transfer Networks
- **Current Assumption:** Dispatches assign a single destination hospital.
- **Real-World Reality:** Major trauma incidents often require immediate field stabilization at a community hospital followed by secondary transfer to a tertiary trauma center.
- **Upgrade Path:** Multi-tier dynamic routing supporting stabilization stopovers and inter-hospital transfers.

---

## 3. Ethical Guardrails & Human Primacy

1. **Starvation Prevention as a Moral Imperative:** Unchecked algorithmic optimization in emergency queues risks indefinite delays for lower-urgency patients during prolonged surges. The dynamic aging mechanism ($P_{eff} = P_{base} - \lfloor \Delta t / \tau \rfloor$) enforces an egalitarian bounded-latency guarantee ($T_{max} \le 120\text{ seconds}$).
2. **Human Dispatcher Primacy:** Automated algorithms must strictly remain advisory. Emergency medical telecommunicators and supervising emergency physicians maintain absolute authority to override any system recommendation, cancel reservation holds, or manually assign hospital destinations.
