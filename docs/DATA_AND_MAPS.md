# Geography, Road Graph & Dataset Audit — Lifeline-Core v2

This document details the geographic model of the Chandigarh-Mohali-Panchkula (Tricity) metropolitan area, the road network graph, and the results of our audit on synthetic emergency healthcare datasets.

---

## 1. Geographic Bounding Box & Coordinate System

The geographic simulation operates within the bounding coordinates of the Chandigarh metropolitan area:

| Boundary | Coordinate | Landmark Reference |
| :--- | :---: | :--- |
| **Minimum Latitude** | $30.640^\circ\text{ N}$ | Zirakpur / Aerocity Mohali |
| **Maximum Latitude** | $30.780^\circ\text{ N}$ | PGIMER / Sector 1 Chandigarh |
| **Minimum Longitude** | $76.680^\circ\text{ E}$ | Kharar / Greater Mohali |
| **Maximum Longitude** | $76.880^\circ\text{ E}$ | Sector 21 Panchkula / MDC |

All spatial coordinates utilize standard **WGS84** (EPSG:4326) coordinates. Distances are computed via the great-circle Haversine formula on an Earth radius of $R = 6371.0\text{ km}$.

---

## 2. Hospital Dataset (`data/hospitals.json`)

The canonical hospital registry contains 50 healthcare facilities (`HOSP-101` through `HOSP-150`) across Chandigarh, Mohali, and Panchkula:

### Primary Tertiary Centers:
1. **PGIMER Chandigarh (`HOSP-101`):** Level 1 Trauma Center, 85 ICU beds, 60 ventilators, walk-in $\lambda = 2.4/\text{hr}$.
2. **GMCH Sector 32 Chandigarh (`HOSP-102`):** Government Medical College, 50 ICU beds, 35 ventilators, $\lambda = 1.8/\text{hr}$.
3. **Fortis Hospital Mohali (`HOSP-104`):** Private Super-Specialty, 40 ICU beds, 25 ventilators, $\lambda = 1.2/\text{hr}$.
4. **Max Super Speciality Mohali (`HOSP-108`):** Multi-Specialty Tertiary, 35 ICU beds, 20 ventilators, $\lambda = 1.1/\text{hr}$.
5. **Civil Hospital Sector 6 Panchkula (`HOSP-105`):** District Civil Center, 30 ICU beds, 15 ventilators, $\lambda = 1.0/\text{hr}$.

### Resource Inventory Model:
Each hospital tracks 4 discrete resource pools:
- `ICU-BED` (Intensive Care Unit)
- `VENTILATOR` (Mechanical Ventilation)
- `OXYGEN-BED` (High-flow oxygenation)
- `GENERAL-BED` (Inpatient observation)

---

## 3. Road Network Graph Topology (`data/tricity_roads.json`)

The road network represents real arterial corridors as a directed graph $G = (V, E)$ containing:
- **24 Arterial Intersections:** Including Tribune Chowk, Transport Chowk, Matka Chowk, Kisan Bhawan, Sector 17 Plaza, PGI Gate, Airport Road Junction, Mohali Phase 7 Light Point, and Bella Vista Roundabout Panchkula.
- **27 Bidirectional Corridors:** Including Madhya Marg ($50\text{ km/h}$), Dakshin Marg ($55\text{ km/h}$), Himalaya Marg ($45\text{ km/h}$), Jan Marg ($50\text{ km/h}$), Airport Road ($60\text{ km/h}$), and NH-5 Himalayan Expressway ($60\text{ km/h}$).

Edge traversal costs represent expected transit duration:
$$\text{weight}(u, v) = \frac{\text{distance\_km}(u, v)}{\text{speed\_kmh}(u, v)} \times 60\text{ minutes}$$

---

## 4. Synthetic Emergency Dataset Audit

During project kickoff, a 50,000-row synthetic emergency dataset (`emergency_data_50k.csv`) was subjected to statistical correlation auditing:

```
Attribute Pair Audit:
Pearson r(trauma_score, distance_km)        =  0.0021 (p = 0.64)  [NO CORRELATION]
Pearson r(patient_age, bed_availability)    = -0.0014 (p = 0.75)  [NO CORRELATION]
Pearson r(trauma_score, transit_time_min)   =  0.0008 (p = 0.86)  [NO CORRELATION]
```

### Critical Findings:
1. **Spurious Generation Artifacts:** Synthetic trauma scores, ages, and arrival times were generated independently using uniform and Gaussian distributions with zero mutual information.
2. **Clinical Irrelevance:** Real trauma triage depends on clinical indicators (Glasgow Coma Scale, systolic blood pressure, respiratory rate). Synthetic datasets lack these features.
3. **Honest Engineering Stance:** Rather than fitting spurious machine learning regressions to random noise, Lifeline-Core v2 isolates request generation to stochastic arrival timing and road-network distance, while evaluating hospital bed contention through rigorous Poisson processes and fine-grained mutex synchronization.
