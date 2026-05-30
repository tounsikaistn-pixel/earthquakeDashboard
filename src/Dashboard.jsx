// src/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  Cell,
  LabelList,
  PieChart,
  Pie,
} from "recharts";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchUSGSData } from "./utils/fetchEarthquakes";

function getContinentFromCoords(lon, lat) {
  if (!lon || !lat) return "Oceanic / Open Sea";
  if (lon >= -170 && lon <= -50 && lat >= 10 && lat <= 85) return "North America";
  if (lon >= -90 && lon <= -35 && lat >= -60 && lat <= 15) return "South America";
  if (lon >= -25 && lon <= 45 && lat >= 35 && lat <= 75) return "Europe";
  if (lon >= -20 && lon <= 52 && lat >= -35 && lat <= 38) return "Africa";
  if (lon >= 45 && lon <= 180 && lat >= 5 && lat <= 75) return "Asia";
  if (lon >= 110 && lon <= 180 && lat >= -50 && lat <= 0) return "Oceania";
  if (lat <= -60) return "Antarctica";
  return "Oceanic / Open Sea";
}

function getDepthBin(depth) {
  if (depth < 100) return "0-100km";
  if (depth >= 100 && depth < 200) return "100-200km";
  if (depth >= 200 && depth < 400) return "200-400km";
  return "400km+";
}

function MapAutoFit({ data, selectedEvent }) {
  const map = useMap();

  useEffect(() => {
    if (selectedEvent?.latitude && selectedEvent?.longitude) {
      map.flyTo([selectedEvent.latitude, selectedEvent.longitude], 5, {
        duration: 0.8,
      });
      return;
    }

    const validPoints = data
      .filter((d) => d.latitude && d.longitude)
      .slice(0, 700)
      .map((d) => [d.latitude, d.longitude]);

    if (validPoints.length === 1) {
      map.flyTo(validPoints[0], 5, { duration: 0.8 });
    }

    if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 5,
      });
    }
  }, [data, selectedEvent, map]);

  return null;
}

export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [selectedMagType, setSelectedMagType] = useState("mb");
  const [maxYear, setMaxYear] = useState(2014);
  const [minMagnitude, setMinMagnitude] = useState(6.0);
  const [tsunamiFilter, setTsunamiFilter] = useState("All");
  const [basemapMode, setBasemapMode] = useState("dark");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFocalMode, setIsFocalMode] = useState(false);
  const [chartFilter, setChartFilter] = useState(null);

  useEffect(() => {
    fetchUSGSData().then((data) => {
      setRawData(data);
      if (data.length > 0) setSelectedEvent(data[0]);
    });
  }, []);

  useEffect(() => {
    const filtered = rawData.filter((d) => {
      return (
        d.magType === selectedMagType &&
        d.year <= maxYear &&
        d.mag >= minMagnitude &&
        (tsunamiFilter === "All" ? true : d.tsunami === tsunamiFilter)
      );
    });

    setFilteredData(filtered);
  }, [rawData, selectedMagType, maxYear, minMagnitude, tsunamiFilter]);

  const interactiveData = useMemo(() => {
    let data = filteredData;

    if (!chartFilter) return data;

    if (chartFilter.type === "continent") {
      data = data.filter(
        (d) => getContinentFromCoords(d.longitude, d.latitude) === chartFilter.value
      );
    }

    if (chartFilter.type === "pager") {
      data = data.filter((d) => (d.alert || "green") === chartFilter.value);
    }

    if (chartFilter.type === "year") {
      data = data.filter((d) => d.year === chartFilter.value);
    }

    if (chartFilter.type === "month") {
      data = data.filter((d) => d.month === chartFilter.value);
    }

    if (chartFilter.type === "depth") {
      data = data.filter((d) => getDepthBin(d.depth) === chartFilter.value);
    }

    if (chartFilter.type === "magnitude") {
      data = data.filter(
        (d) => Math.floor(d.mag * 10) / 10 === chartFilter.value
      );
    }

    return data;
  }, [filteredData, chartFilter]);

  const chartDataSource = useMemo(() => {
    if (isFocalMode && selectedEvent) return [selectedEvent];
    return interactiveData;
  }, [interactiveData, isFocalMode, selectedEvent]);

  const applyChartFilter = (type, value) => {
    setChartFilter({ type, value });
    setIsFocalMode(false);
    setSelectedEvent(null);
  };

  const clearChartFilter = () => {
    setChartFilter(null);
    setIsFocalMode(false);
    setSelectedEvent(null);
  };

  const continentData = useMemo(() => {
    const counts = {
      Asia: 0,
      "North America": 0,
      Europe: 0,
      Africa: 0,
      "South America": 0,
      Oceania: 0,
      "Oceanic / Open Sea": 0,
    };

    chartDataSource.forEach((d) => {
      const cont = getContinentFromCoords(d.longitude, d.latitude);
      if (counts[cont] !== undefined) counts[cont]++;
    });

    return Object.keys(counts)
      .map((name) => ({ name, count: counts[name] }))
      .filter((item) => item.count > 0);
  }, [chartDataSource]);

  const magData = useMemo(() => {
    const counts = {};

    chartDataSource.forEach((d) => {
      const rounded = Math.floor(d.mag * 10) / 10;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });

    return Object.keys(counts)
      .map((k) => ({ mag: parseFloat(k), count: counts[k] }))
      .sort((a, b) => a.mag - b.mag);
  }, [chartDataSource]);

  const monthData = useMemo(() => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const counts = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});

    chartDataSource.forEach((d) => {
      if (counts[d.month] !== undefined) counts[d.month]++;
    });

    return months.map((m) => ({ name: m, count: counts[m] }));
  }, [chartDataSource]);

  const yearData = useMemo(() => {
    const counts = {};

    chartDataSource.forEach((d) => {
      counts[d.year] = (counts[d.year] || 0) + 1;
    });

    return Object.keys(counts)
      .map((k) => ({ year: parseInt(k, 10), count: counts[k] }))
      .sort((a, b) => a.year - b.year);
  }, [chartDataSource]);

  const depthData = useMemo(
    () => [
      {
        bin: "0-100km",
        count: chartDataSource.filter((d) => d.depth < 100).length,
      },
      {
        bin: "100-200km",
        count: chartDataSource.filter((d) => d.depth >= 100 && d.depth < 200)
          .length,
      },
      {
        bin: "200-400km",
        count: chartDataSource.filter((d) => d.depth >= 200 && d.depth < 400)
          .length,
      },
      {
        bin: "400km+",
        count: chartDataSource.filter((d) => d.depth >= 400).length,
      },
    ],
    [chartDataSource]
  );

  const pagerData = useMemo(() => {
    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };

    chartDataSource.forEach((d) => {
      const alertType = d.alert || "green";
      if (counts[alertType] !== undefined) counts[alertType]++;
    });

    return Object.keys(counts)
      .map((name) => ({ name, value: counts[name] }))
      .filter((item) => item.value > 0);
  }, [chartDataSource]);

  const significanceData = useMemo(() => {
    return chartDataSource
      .slice(0, 15)
      .map((d, index) => ({
        id: d.id || index,
        event: d,
        name: d.place ? d.place.substring(0, 10) + "..." : "Unknown",
        score: d.sigScore || Math.floor(d.mag * 100),
      }))
      .sort((a, b) => b.score - a.score);
  }, [chartDataSource]);

  const handleResetFilters = () => {
    setSelectedMagType("mb");
    setMaxYear(2026);
    setMinMagnitude(6.0);
    setTsunamiFilter("All");
    setIsFocalMode(false);
    setBasemapMode("dark");
    setChartFilter(null);
    setSelectedEvent(null);
  };

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>1. Mag Scale Type</label>
          <select
            value={selectedMagType}
            onChange={(e) => {
              setSelectedMagType(e.target.value);
              setChartFilter(null);
              setIsFocalMode(false);
            }}
            style={selectStyle}
          >
            <option value="mb">mb Body Wave</option>
            <option value="mw">mw Moment</option>
            <option value="ms">ms Surface Wave</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>2. Max Year Limit ({maxYear})</label>
          <input
            type="range"
            min="1900"
            max="2026"
            value={maxYear}
            onChange={(e) => {
              setMaxYear(Number(e.target.value));
              setChartFilter(null);
              setIsFocalMode(false);
            }}
            style={{ width: "100%", accentColor: "#2563eb", marginTop: "8px" }}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>3. Min Mag Floor</label>
          <select
            value={minMagnitude}
            onChange={(e) => {
              setMinMagnitude(parseFloat(e.target.value));
              setChartFilter(null);
              setIsFocalMode(false);
            }}
            style={selectStyle}
          >
            <option value="6.0">M 6.0 Major</option>
            <option value="6.5">M 6.5</option>
            <option value="7.0">M 7.0 Epic</option>
            <option value="7.5">M 7.5</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>4. Tsunami Alert</label>
          <select
            value={tsunamiFilter}
            onChange={(e) => {
              setTsunamiFilter(e.target.value);
              setChartFilter(null);
              setIsFocalMode(false);
            }}
            style={selectStyle}
          >
            <option value="All">All Events</option>
            <option value="Yes">Tsunami Generated</option>
            <option value="No">No Tsunami Risk</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>5. Basemap Layer</label>
          <select
            value={basemapMode}
            onChange={(e) => setBasemapMode(e.target.value)}
            style={selectStyle}
          >
            <option value="dark">Dark Basemap</option>
            <option value="light">Light OpenStreetMap</option>
          </select>
        </div>

        <div style={{ ...fieldStyle, justifyContent: "flex-end" }}>
          <button onClick={handleResetFilters} style={buttonStyle}>
            6. Reset View Matrix
          </button>
        </div>
      </div>

      {(chartFilter || isFocalMode) && (
        <div style={activeFilterStyle}>
          <span>
            Active interaction:{" "}
            {isFocalMode && selectedEvent
              ? `Selected event — ${selectedEvent.place}`
              : `${chartFilter?.type}: ${chartFilter?.value}`}
          </span>

          <button onClick={clearChartFilter} style={clearFilterButtonStyle}>
            Clear interaction
          </button>
        </div>
      )}

      <div style={gridStyle}>
        <div style={mapPanelStyle}>
          <div style={mapHeaderStyle}>
            <div>
              <h3 style={mapTitleStyle}>Leaflet Earthquake Map Canvas</h3>
              <span style={{ fontSize: "8px", color: "#71717a" }}>
                {interactiveData.length} filtered events mapped / {filteredData.length} total after top filters
              </span>
            </div>

            {isFocalMode && (
              <button onClick={clearChartFilter} style={clearButtonStyle}>
                Clear Focal Lock ✕
              </button>
            )}
          </div>

          <div style={mapBoxStyle}>
            <MapContainer
              center={[20, 0]}
              zoom={2}
              minZoom={2}
              maxZoom={8}
              style={{ width: "100%", height: "100%" }}
              worldCopyJump={true}
            >
              <TileLayer
                url={
                  basemapMode === "dark"
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                attribution="&copy; OpenStreetMap contributors"
              />

              <MapAutoFit data={interactiveData} selectedEvent={isFocalMode ? selectedEvent : null} />

              {interactiveData.slice(0, 700).map((d) => {
                if (!d.latitude || !d.longitude) return null;

                const isSelected = selectedEvent?.id === d.id;

                return (
                  <CircleMarker
                    key={d.id}
                    center={[d.latitude, d.longitude]}
                    radius={isSelected ? 9 : Math.max(d.mag * 1.2, 4)}
                    pathOptions={{
                      color: isSelected ? "#ffffff" : "#2563eb",
                      fillColor: isSelected ? "#f59e0b" : "#2563eb",
                      fillOpacity: isSelected ? 0.95 : 0.6,
                      weight: isSelected ? 2 : 1,
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedEvent(d);
                        setIsFocalMode(true);
                      },
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: "180px" }}>
                        <strong>{d.place || "Unknown location"}</strong>
                        <br />
                        Magnitude: {d.mag} {d.magType}
                        <br />
                        Depth: {d.depth?.toFixed(1)} km
                        <br />
                        Year: {d.year}
                        <br />
                        Month: {d.month}
                        <br />
                        Continent: {getContinentFromCoords(d.longitude, d.latitude)}
                        <br />
                        Tsunami: {d.tsunami}
                        <br />
                        Alert: {d.alert || "green"}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={titleStyle}>GIS Telemetry Inspector</h3>

          {selectedEvent ? (
            <div style={inspectorBoxStyle}>
              <div>
                <span style={smallTextStyle}>Feature Location</span>
                <div style={locationTextStyle}>{selectedEvent.place}</div>
              </div>

              <div style={rowBetweenStyle}>
                <div>
                  <span style={smallTextStyle}>Magnitude Metric</span>
                  <div style={{ fontSize: "11px", fontWeight: "900", color: "#2563eb" }}>
                    {selectedEvent.mag} {selectedEvent.magType}
                  </div>
                </div>

                <div>
                  <span style={smallTextStyle}>Hypocentral Depth</span>
                  <div style={{ fontSize: "11px", fontWeight: "900", color: "#ef4444" }}>
                    {selectedEvent.depth?.toFixed(1)} km
                  </div>
                </div>
              </div>

              <div style={{ ...rowBetweenStyle, borderTop: "1px solid #27272a", paddingTop: "2px" }}>
                <div>
                  <span style={smallTextStyle}>Tsunami Trigger</span>
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: "bold",
                      color: selectedEvent.tsunami === "Yes" ? "#10b981" : "#a1a1aa",
                    }}
                  >
                    {selectedEvent.tsunami}
                  </div>
                </div>

                <div>
                  <span style={smallTextStyle}>PAGER Tier</span>
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: "bold",
                      color: "#f59e0b",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedEvent.alert || "green"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#71717a", fontSize: "10px", textAlign: "center", marginTop: "20px" }}>
              Click a map marker or a significance bar.
            </div>
          )}
        </div>

        <ChartPanel title="Spatial Continent Share">
          <BarChart width={200} height={100} data={continentData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <XAxis type="number" stroke="#52525b" fontSize={7} />
            <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={7} width={65} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              radius={[0, 2, 2, 0]}
              barSize={6}
              cursor="pointer"
              onClick={(data) => applyChartFilter("continent", data.name)}
            />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="PAGER Alert Levels Proportion">
          <PieChart width={140} height={100}>
            <Pie
              data={pagerData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={18}
              outerRadius={32}
              paddingAngle={3}
              cursor="pointer"
              onClick={(data) => applyChartFilter("pager", data.name)}
            >
              {pagerData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.name === "red"
                      ? "#ef4444"
                      : entry.name === "orange"
                      ? "#f97316"
                      : entry.name === "yellow"
                      ? "#facc15"
                      : "#22c55e"
                  }
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ChartPanel>

        <ChartPanel title="USGS Event Significance Scores">
          <BarChart width={200} height={100} data={significanceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#52525b" fontSize={6} tick={false} />
            <YAxis stroke="#52525b" fontSize={7} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="score"
              fill="#f59e0b"
              radius={[2, 2, 0, 0]}
              barSize={10}
              cursor="pointer"
              onClick={(data) => {
                setSelectedEvent(data.event);
                setIsFocalMode(true);
              }}
            />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Temporal Event Trends By Year">
          <AreaChart width={220} height={100} data={yearData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis dataKey="year" stroke="#71717a" fontSize={7} />
            <YAxis stroke="#71717a" fontSize={7} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              fill="#1d4ed8"
              fillOpacity={0.15}
              strokeWidth={1}
              cursor="pointer"
              onClick={(data) => applyChartFilter("year", data.year)}
            />
          </AreaChart>
        </ChartPanel>

        <ChartPanel title="Depth Bins Histogram">
          <BarChart width={220} height={100} data={depthData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <XAxis dataKey="bin" stroke="#71717a" fontSize={7} />
            <YAxis stroke="#71717a" fontSize={7} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              fill="#2563eb"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
              onClick={(data) => applyChartFilter("depth", data.bin)}
            >
              <LabelList dataKey="count" position="top" fill="#a1a1aa" fontSize={7} />
            </Bar>
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Earthquakes by Magnitude">
          <BarChart width={220} height={100} data={magData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis dataKey="mag" stroke="#52525b" fontSize={7} />
            <YAxis stroke="#52525b" fontSize={7} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              fill="#2563eb"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
              onClick={(data) => applyChartFilter("magnitude", data.mag)}
            >
              {magData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.mag >= 7.0 ? "#3b82f6" : "#1d4ed8"} />
              ))}
            </Bar>
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Seasonal Distribution By Month">
          <BarChart width={220} height={100} data={monthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#71717a" fontSize={7} tickFormatter={(str) => str.substring(0, 3)} />
            <YAxis stroke="#71717a" fontSize={7} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="count"
              fill="#2563eb"
              radius={[1.5, 1.5, 0, 0]}
              cursor="pointer"
              onClick={(data) => applyChartFilter("month", data.name)}
            />
          </BarChart>
        </ChartPanel>
      </div>
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>{title}</h3>
      <div style={chartContainerStyle}>{children}</div>
    </div>
  );
}

const pageStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "#000000",
  color: "#ffffff",
  padding: "10px",
  fontFamily: "sans-serif",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const topBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "8px",
  backgroundColor: "#0a0a0a",
  padding: "8px",
  borderRadius: "10px",
  border: "1px solid #1f1f23",
  flexShrink: 0,
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
};

const activeFilterStyle = {
  backgroundColor: "#111827",
  border: "1px solid #1d4ed8",
  borderRadius: "8px",
  padding: "6px 10px",
  fontSize: "11px",
  color: "#dbeafe",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const clearFilterButtonStyle = {
  backgroundColor: "#1e3a8a",
  border: "1px solid #3b82f6",
  color: "#ffffff",
  borderRadius: "5px",
  padding: "3px 8px",
  fontSize: "10px",
  cursor: "pointer",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gridTemplateRows: "repeat(3, 1fr)",
  gap: "8px",
  flexGrow: 1,
  minHeight: 0,
};

const panelStyle = {
  backgroundColor: "#0a0a0a",
  border: "1px solid #1f1f23",
  borderRadius: "10px",
  padding: "8px",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const mapPanelStyle = {
  gridColumn: "span 2",
  gridRow: "span 2",
  ...panelStyle,
  position: "relative",
};

const mapHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "4px",
  zIndex: 10,
};

const mapTitleStyle = {
  fontSize: "10px",
  fontWeight: "bold",
  color: "#d4d4d8",
  textTransform: "uppercase",
  margin: 0,
};

const mapBoxStyle = {
  flexGrow: 1,
  borderRadius: "6px",
  overflow: "hidden",
  position: "relative",
  border: "1px solid #141416",
  minHeight: 0,
};

const titleStyle = {
  fontSize: "9px",
  fontWeight: "bold",
  color: "#71717a",
  textTransform: "uppercase",
  margin: "0 0 4px 0",
};

const chartContainerStyle = {
  flexGrow: 1,
  minHeight: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const labelStyle = {
  fontSize: "9px",
  color: "#a1a1aa",
  fontWeight: "600",
  marginBottom: "2px",
  textTransform: "uppercase",
};

const selectStyle = {
  backgroundColor: "#141416",
  border: "1px solid #2d2d34",
  color: "#fff",
  padding: "4px",
  borderRadius: "5px",
  fontSize: "11px",
  outline: "none",
};

const buttonStyle = {
  backgroundColor: "#1f1f23",
  border: "1px solid #3f3f46",
  color: "#fff",
  padding: "4px",
  borderRadius: "5px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "11px",
  height: "24px",
};

const clearButtonStyle = {
  backgroundColor: "#ef444422",
  border: "1px solid #ef444455",
  color: "#f87171",
  fontSize: "8px",
  padding: "2px 6px",
  borderRadius: "4px",
  cursor: "pointer",
};

const inspectorBoxStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  backgroundColor: "#111111",
  padding: "6px",
  borderRadius: "6px",
  border: "1px solid #27272a",
  flexGrow: 1,
  justifyContent: "center",
};

const smallTextStyle = {
  color: "#71717a",
  fontSize: "8px",
  textTransform: "uppercase",
};

const locationTextStyle = {
  fontSize: "11px",
  fontWeight: "bold",
  color: "#fff",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rowBetweenStyle = {
  display: "flex",
  justifyContent: "space-between",
};

const tooltipStyle = {
  backgroundColor: "#09090b",
  borderColor: "#27272a",
  color: "#fff",
  fontSize: "8px",
};