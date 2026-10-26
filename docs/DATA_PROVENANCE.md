# Data Provenance, Licensing & Geographic Integrity — Lifeline-Core v3

This document records the provenance, collection methodology, verification status, and licensing terms for all data assets utilized by **Lifeline-Core v3**.

---

## 1. Hospital Facilities Dataset (`data/hospitals.json`, `data/hospitals.csv`)

### Provenance & Verification Classification
The hospital directory contains 50 facilities across Chandigarh, Mohali, and Panchkula:

| Category | Facility Identifiers | Source & Provenance | Verification Status | Operational Capacity Assumption |
| :--- | :--- | :--- | :---: | :--- |
| **Major Tertiary & Government Hospitals** | `HOSP-101` (PGIMER), `HOSP-102` (GMCH-32), `HOSP-103` (GMSH-16), `HOSP-105` (Civil Panchkula) | Verified against official Chandigarh Health Department and PGIMER public directories. Coordinates cross-referenced with survey maps. | **VERIFIED LOCATION** | Resource counts are realistic baseline estimates; live capacity is simulated for research. |
| **Private Multi-Specialty Centers** | `HOSP-104` (Fortis Mohali), `HOSP-108` (Max Mohali), `HOSP-114` (Silver Oaks), `HOSP-116` (Mukat), `HOSP-120` (Alchemist) | Verified against registered hospital directories in SAS Nagar (Mohali) and Panchkula. | **VERIFIED LOCATION** | Resource counts are realistic baseline estimates. |
| **Community Clinics & Nursing Homes** | `HOSP-121` through `HOSP-150` | Synthetically distributed across residential sectors to represent local emergency reception capacity. | **SYNTHETIC DEMO** | Labeled as synthetic simulation records; never presented as verified operational facilities. |

---

## 2. Road Network Graph Topology (`data/tricity_roads.json`)

### Source & OpenStreetMap Attribution
- **Source:** OpenStreetMap (OSM) road corridor geometry covering the Chandigarh Master Plan grid.
- **Extraction Bounds:** $30.640^\circ\text{ N}$ to $30.780^\circ\text{ N}$, $76.680^\circ\text{ E}$ to $76.880^\circ\text{ E}$.
- **Attribution:** Contains information from OpenStreetMap, which is made available under the Open Database License (ODbL). © OpenStreetMap contributors.
- **Topological Structure:** 24 arterial roundabouts / junctions (e.g. Tribune Chowk, Transport Chowk, Matka Chowk, PGI Gate) and 27 bidirectional arterial corridors (Madhya Marg, Dakshin Marg, Himalaya Marg, Airport Road, NH-5).
- **Speed Assumptions:** Fixed arterial speed limits between $40\text{ km/h}$ and $60\text{ km/h}$. Fixed corridor speeds do not model dynamic traffic jams or weather; labeled as static graph travel times.

---

## 3. Synthetic Request Workload Integrity

- **Ground Truth Generation:** Request arrivals follow a controlled non-homogeneous Poisson process with fixed PRNG seeds (Seeds 42 through 61).
- **Audit Transparency:** As detailed in `docs/DATA_AND_MAPS.md`, the 50,000-row synthetic emergency dataset (`emergency_data_50k.csv`) was found to have zero correlation ($r = 0.002$) with clinical trauma severity. Lifeline-Core v3 strictly avoids training spurious machine learning models on this data and isolates it to stochastic incident arrival times.
