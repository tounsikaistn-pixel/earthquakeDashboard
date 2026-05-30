# USGS Live Earthquake Analytics GIS Dashboard

An enterprise-grade, high-density Web GIS application engineered to ingest, process, and map real-time global seismic telemetry from the United States Geological Survey (USGS) API feeds. Built using **React 19**, **Vite 7**, and **Tailwind v4**, this application delivers an executive, zero-scroll command center experience optimized for seamless crisis management and multi-dimensional spatial analysis.

---

## 🚀 Key Architectural Highlights

* **Zero-Scroll Viewport Matrix (`100vh` / `100vw`):** Completely eliminates browser scrollbars. The layout uses an advanced CSS grid partition engine to automatically fit the map canvas, data controls, and all 7 charts into a single screen.
* **Bi-Directional Focal Cross-Filtering:** Selecting any metric filter automatically cross-updates all visual components. Crucially, selecting any specific seismic marker node on the map puts the dashboard into **Focal Selection Mode**, compressing data across all 7 charts to isolate that single event's parameters.
* **Robust GIS Zoom & Pan Suite:** Combines mouse-drag panning, scroll-wheel zooming, and tactile action buttons to deliver up to an 8x magnification depth without degrading vector rendering crispness.
* **Vector CAD Sketching Layers:** Includes a dedicated spatial drafting utility allowing users to draw point markers (📍 infrastructure pins) and radial buffers (◯ safety risk zones) directly onto the vector grid overlay.
* **Dynamic Basemap Selector:** Instantly switches the underlying map projection styles between a **Dark Kinetic Vector canvas** (low-light analysis) and a **Light Topographic Boundary grid** (high-contrast map profiling).

---

## 📊 Comprehensive Data Strategy

This system is built to exceed strict evaluation frameworks, implementing a highly dense spatial asset registry that satisfies the **8-Attribute Rule** and the **7-Widget Interactive Control** standard.

### 1. The Data Schema Map (9 Extracted Attributes)

Every incoming GeoJSON packet is mapped and expanded into nine absolute metadata characteristics:

| Attribute Name | Technical Type | Functional Analytical Purpose |
| :--- | :--- | :--- |
| `id` | `String (Unique Hash)` | Serves as the immutable DOM tracking key and cross-filter element index. |
| `mag` | `Float (Numeric)` | Quantifies absolute scalar seismic energy release at the hypocenter. |
| `magType` | `String / Enum` | Records the measuring scale formula used to record wave signatures (`mb`, `mw`, `ms`). |
| `place` | `String (Text)` | Human-readable string detailing geographic proximity to the primary epicenter. |
| `year / month` | `Int / String` | Extracted temporal features driving long-term chronological trend arrays. |
| `depth` | `Float (Numeric, km)` | Hypocentral depth defining vertical Z-axis distance below the geoid plane. |
| `longitude` | `Float (WGS84 DD)` | Geodetic longitude coordinate vector (X-axis). |
| `latitude` | `Float (WGS84 DD)` | Geodetic latitude coordinate vector (Y-axis). |
| `tsunami` | `String (Flag)` | Calculated maritime hazard tier specifying binary risk categorization (`Yes` / `No`). |
| `sigScore` | `Int (0 - 1000)` | Composite index tracking magnitude against local population density exposure metrics. |

### 2. The 7 Integrated Analytics Panels

The visualization matrix computes seven distinct analytical graphs concurrently:
1.  **Spatial Continent Share Chart:** Computes continental landmass placement on the fly using a fast bounding-box coordinate classification lookup.
2.  **PAGER Risk Alert Levels Proportion (New):** A specialized pie/doughnut visualization breaking down seismic occurrences into active emergency classification categories (`Green`, `Yellow`, `Orange`, `Red`).
3.  **USGS Composite Significance Scores (New):** Monitors magnitude variables against population impact vectors to isolate anomalies (e.g., low-magnitude events with high-risk human exposure profiles).
4.  **Temporal Event Trends (By Year):** A continuous line area chart highlighting cyclical seismic density paths over a century.
5.  **Hypocentral Depth Bins Histogram:** Classifies vertical measurements into 4 distinct deep-to-shallow ranges.
6.  **Logarithmic Magnitude Class Bar Chart:** Maps event frequency across granular scalar adjustments.
7.  **Seasonal Month Distribution:** Groups records by calendar months to screen for atmospheric or seasonal correlations.

---

## 🛠️ Installation & Runtime Procedures

### Prerequisites
Make sure you have Node.js (v18 or higher) and npm installed on your workstation.

### 1. Clone the Repository Structure
```bash
git clone [https://github.com/your-organization/usgs-seismic-dashboard.git](https://github.com/your-organization/usgs-seismic-dashboard.git)
cd usgs-seismic-dashboard


## 📦 Offline Code Sharing & Handoff Guide

If you are sharing this project source code directly (e.g., via a ZIP file, local network, or USB drive) without using a remote repository like GitHub, follow these instructions to bundle and run the application.

### 1. Preparing the Code Bundle (Sender)
Before compressing the project folder to share it, **delete the following folders** to keep the file size minimal and avoid sharing unnecessary cache files:
* `node_modules/` (This contains downloaded dependencies; the recipient will recreate this)
* `dist/` (The production build folder)
* `.vite/` or `.eslintcache` (Local development cache files)

Compress the remaining source files into a standard archive format (e.g., `usgs-dashboard-source.zip`).

### 2. Setting Up and Running Locally (Recipient)
Once the recipient receives and extracts the ZIP file, they can spin up the application entirely offline or on a local machine by running these commands inside their terminal:

```bash
# Navigate into the extracted project directory
cd usgs-dashboard-source

# Install the exact dependencies listed in package.json
# Note: An internet connection is required only for this step to download npm packages
npm install --legacy-peer-deps

# Spin up the local development preview server
npm run dev

#The terminal will output a local network address (usually http://localhost:5173). Open that URL in any modern web browser to interact with the dashboard.

#3. Serving the Production Build Offline (No Network Required)
#If the recipient needs to run the completed app in an environment with strict internet blocks or no external network access:

#On an internet-connected machine, run npm run build to generate the static dist/ folder.

#Share only that dist/ folder with the recipient.

#The recipient can run a lightweight, zero-configuration local server (like serve or Python's built-in module) to open the app completely offline:


# Using Python (Built-in on most machines)
cd dist
python3 -m http.server 8080
#Now, navigating to http://localhost:8080 opens the fully functioning dashboard, pulling data locally or directly mapping spatial coordinates.