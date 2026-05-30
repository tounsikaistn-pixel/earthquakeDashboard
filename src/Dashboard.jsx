// src/Dashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, Cell, LabelList, PieChart, Pie } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { fetchUSGSData } from './utils/fetchEarthquakes';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

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

export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const mapContainerRef = useRef(null);
  
  // GLOBAL METRIC VARIABLES
  const [selectedMagType, setSelectedMagType] = useState('mb');
  const [maxYear, setMaxYear] = useState(2014); 
  const [minMagnitude, setMinMagnitude] = useState(6.0);
  const [tsunamiFilter, setTsunamiFilter] = useState('All');
  
  // BASEMAP CONFIGURATION STATE
  const [basemapMode, setBasemapMode] = useState('dark'); // 'dark' or 'light'

  // BI-DIRECTIONAL LOCK SELECTION HOOKS
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFocalMode, setIsFocalMode] = useState(false);

  // COORDINATE MATRIX SPATIAL TRANSLATE VIEWPORT STATE
  const [mapState, setMapState] = useState({ zoom: 1, center: [0, 20] });

  // DRAWING TOOLS OVERLAY STATE
  const [drawingMode, setDrawingMode] = useState('none'); 
  const [drawnShapes, setDrawnShapes] = useState([]);

  useEffect(() => {
    fetchUSGSData().then(data => {
      setRawData(data);
      if (data.length > 0) setSelectedEvent(data[0]);
    });
  }, []);

  useEffect(() => {
    let filtered = rawData.filter(d => {
      return d.magType === selectedMagType && 
             d.year <= maxYear && 
             d.mag >= minMagnitude && 
             (tsunamiFilter === 'All' ? true : d.tsunami === tsunamiFilter);
    });
    setFilteredData(filtered);
  }, [rawData, selectedMagType, maxYear, minMagnitude, tsunamiFilter]);

  const chartDataSource = useMemo(() => {
    if (isFocalMode && selectedEvent) {
      return [selectedEvent];
    }
    return filteredData;
  }, [filteredData, isFocalMode, selectedEvent]);

  // --- THE 7 ANALYTICS DATA AGGREGATION PIPELINES ---
  const continentData = useMemo(() => {
    const counts = { "Asia": 0, "North America": 0, "Europe": 0, "Africa": 0, "South America": 0, "Oceania": 0, "Oceanic / Open Sea": 0 };
    chartDataSource.forEach(d => {
      const cont = getContinentFromCoords(d.longitude, d.latitude);
      if (counts[cont] !== undefined) counts[cont]++;
    });
    return Object.keys(counts).map(name => ({ name, count: counts[name] })).filter(item => item.count > 0);
  }, [chartDataSource]);

  const magData = useMemo(() => {
    const counts = {};
    chartDataSource.forEach(d => {
      const rounded = Math.floor(d.mag * 10) / 10;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ mag: parseFloat(k), count: counts[k] })).sort((a,b) => a.mag - b.mag);
  }, [chartDataSource]);

  const monthData = useMemo(() => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const counts = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
    chartDataSource.forEach(d => { if(counts[d.month] !== undefined) counts[d.month]++; });
    return months.map(m => ({ name: m, count: counts[m] }));
  }, [chartDataSource]);

  const yearData = useMemo(() => {
    const counts = {};
    chartDataSource.forEach(d => { counts[d.year] = (counts[d.year] || 0) + 1; });
    return Object.keys(counts).map(k => ({ year: parseInt(k), count: counts[k] })).sort((a,b) => a.year - b.year);
  }, [chartDataSource]);

  const depthData = useMemo(() => [
    { bin: "0-100km", count: chartDataSource.filter(d => d.depth < 100).length },
    { bin: "100-200km", count: chartDataSource.filter(d => d.depth >= 100 && d.depth < 200).length },
    { bin: "200-400km", count: chartDataSource.filter(d => d.depth >= 200 && d.depth < 400).length },
    { bin: "400km+", count: chartDataSource.filter(d => d.depth >= 400).length },
  ], [chartDataSource]);

  const pagerData = useMemo(() => {
    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    chartDataSource.forEach(d => {
      const alertType = d.alert || 'green';
      if (counts[alertType] !== undefined) counts[alertType]++;
    });
    return Object.keys(counts).map(name => ({ name, value: counts[name] })).filter(item => item.value > 0);
  }, [chartDataSource]);

  const significanceData = useMemo(() => {
    return chartDataSource.slice(0, 15).map((d, index) => ({
      id: d.id || index,
      name: d.place ? d.place.substring(0, 10) + '...' : 'Unknown Location',
      score: d.sigScore || Math.floor(d.mag * 100)
    })).sort((a,b) => b.score - a.score);
  }, [chartDataSource]);

  // NAVIGATION CONTROLS
  const handleZoomIn = () => setMapState(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }));
  const handleZoomOut = () => setMapState(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }));
  const handleHomeReset = () => setMapState({ zoom: 1, center: [0, 20] });
  
  const handlePan = (direction) => {
    const step = 20 / mapState.zoom;
    setMapState(prev => {
      switch (direction) {
        case 'UP': return { ...prev, center: [prev.center[0], prev.center[1] + step] };
        case 'DOWN': return { ...prev, center: [prev.center[0], prev.center[1] - step] };
        case 'LEFT': return { ...prev, center: [prev.center[0] + step, prev.center[1]] };
        case 'RIGHT': return { ...prev, center: [prev.center[0] - step, prev.center[1]] };
        default: return prev;
      }
    });
  };

  const handleMapCanvasClick = (e) => {
    // Only drop selection filters if we are not actively sketching shapes
    if (drawingMode === 'none') {
      setIsFocalMode(false);
    }
  };

  // FIXED SCREEN COORDINATE LAYER MAPPER ENGINE
  const handleVectorOverlayDraw = (event) => {
    if (drawingMode === 'none') return;
    event.stopPropagation();

    const svgElement = event.currentTarget;
    const rect = svgElement.getBoundingClientRect();
    
    // Explicit bounding box normalizer converts viewport clicks into scalable internal SVG coordinates
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    const scaleX = 600 / rect.width;
    const scaleY = 300 / rect.height;

    const normalizedX = clickX * scaleX;
    const normalizedY = clickY * scaleY;

    setDrawnShapes(prev => [...prev, { 
      id: Date.now(), 
      type: drawingMode, 
      x: normalizedX, 
      y: normalizedY 
    }]);
    
    setDrawingMode('none'); 
  };

  const handleResetFilters = () => {
    setSelectedMagType('mb'); setMaxYear(2026); setMinMagnitude(6.0); setTsunamiFilter('All');
    setDrawnShapes([]); setIsFocalMode(false); setBasemapMode('dark'); handleHomeReset();
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000000', color: '#ffffff', padding: '10px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      {/* 1. TOP CONTROL BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', backgroundColor: '#0a0a0a', padding: '8px', borderRadius: '10px', border: '1px solid #1f1f23', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '9px', color: '#a1a1aa', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase' }}>1. Mag Scale Type</label>
          <select value={selectedMagType} onChange={(e) => setSelectedMagType(e.target.value)} style={{ backgroundColor: '#141416', border: '1px solid #2d2d34', color: '#fff', padding: '4px', borderRadius: '5px', fontSize: '11px', outline: 'none' }}>
            <option value="mb">mb (Body Wave)</option>
            <option value="mw">mw (Moment)</option>
            <option value="ms">ms (Surface Wave)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <label style={{ fontSize: '9px', color: '#a1a1aa', fontWeight: '600', marginBottom: '1px', textTransform: 'uppercase' }}>2. Max Year Limit ({maxYear})</label>
          <input type="range" min="1900" max="2026" value={maxYear} onChange={(e) => setMaxYear(Number(e.target.value))} style={{ width: '100%', accentColor: '#2563eb', margin: 0 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '9px', color: '#a1a1aa', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase' }}>3. Min Mag Floor</label>
          <select value={minMagnitude} onChange={(e) => setMinMagnitude(parseFloat(e.target.value))} style={{ backgroundColor: '#141416', border: '1px solid #2d2d34', color: '#fff', padding: '4px', borderRadius: '5px', fontSize: '11px', outline: 'none' }}>
            <option value="6.0">M 6.0 (Major)</option>
            <option value="6.5">M 6.5</option>
            <option value="7.0">M 7.0 (Epic)</option>
            <option value="7.5">M 7.5</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '9px', color: '#a1a1aa', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase' }}>4. Tsunami Alert</label>
          <select value={tsunamiFilter} onChange={(e) => setTsunamiFilter(e.target.value)} style={{ backgroundColor: '#141416', border: '1px solid #2d2d34', color: '#fff', padding: '4px', borderRadius: '5px', fontSize: '11px', outline: 'none' }}>
            <option value="All">All Events</option>
            <option value="Yes">Tsunami Generated</option>
            <option value="No">No Tsunami Risk</option>
          </select>
        </div>

        {/* NEWLY INTEGRATED WIDGET: BASEMAP MATRIC SWITCHER */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '9px', color: '#a1a1aa', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase' }}>5. Basemap Layer</label>
          <select value={basemapMode} onChange={(e) => setBasemapMode(e.target.value)} style={{ backgroundColor: '#141416', border: '1px solid #2d2d34', color: '#fff', padding: '4px', borderRadius: '5px', fontSize: '11px', outline: 'none' }}>
            <option value="dark">Dark Kinetic Vector</option>
            <option value="light">Light Topo Boundary</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button onClick={handleResetFilters} style={{ backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', padding: '4px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', height: '24px' }}>
            6. Reset View Matrix
          </button>
        </div>
      </div>

      {/* 2. ZERO-SCROLL WORKSPACE GRID (4-COLUMNS x 3-ROWS MATRIX) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '8px', flexGrow: 1, minHeight: 0 }}>
        
        {/* PANEL 1: GIS CANVAS VIEWPORT WORKSPACE (TAKES 2 COLUMNS x 2 ROWS SPACE) */}
        <div ref={mapContainerRef} style={{ gridColumn: 'span 2', gridRow: 'span 2', backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#d4d4d8', textTransform: 'uppercase', margin: 0 }}>Cartographic Engine Map Canvas</h3>
              <span style={{ fontSize: '8px', color: '#71717a' }}>{filteredData.length} active vector objects mapped</span>
            </div>
            {isFocalMode && (
              <button onClick={() => setIsFocalMode(false)} style={{ backgroundColor: '#ef444422', border: '1px solid #ef444455', color: '#f87171', fontSize: '8px', padding: '1px 5px', borderRadius: '4px', cursor: 'pointer' }}>
                Clear Focal Lock ✕
              </button>
            )}
          </div>
          
          <div style={{ flexGrow: 1, backgroundColor: basemapMode === 'dark' ? '#050505' : '#e2e8f0', borderRadius: '6px', overflow: 'hidden', position: 'relative', border: '1px solid #141416' }} onClick={handleMapCanvasClick}>
            
            {/* FLOATING ACTION OVERLAY MAP NAVIGATION CONTROLS */}
            <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 50, backgroundColor: '#0a0a0acc', padding: '5px', borderRadius: '6px', border: '1px solid #27272a', alignItems: 'center' }}>
              <button onClick={handleZoomIn} title="Zoom In" style={{ width: '22px', height: '22px', backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>+</button>
              <button onClick={handleZoomOut} title="Zoom Out" style={{ width: '22px', height: '22px', backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>−</button>
              <button onClick={handleHomeReset} title="Reset Center View" style={{ width: '22px', height: '22px', backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>⌂</button>
              <div style={{ height: '1px', backgroundColor: '#27272a', margin: '2px 0', width: '100%' }} />
              <button onClick={() => handlePan('UP')} style={{ width: '20px', height: '20px', backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' }}>▲</button>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={() => handlePan('LEFT')} style={{ width: '20px', height: '20px', backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' }}>◀</button>
                <button onClick={() => handlePan('RIGHT')} style={{ width: '20px', height: '20px', backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' }}>▶</button>
              </div>
              <button onClick={() => handlePan('DOWN')} style={{ width: '20px', height: '20px', backgroundColor: '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' }}>▼</button>
              <div style={{ height: '1px', backgroundColor: '#27272a', margin: '2px 0', width: '100%' }} />
              <button onClick={() => setDrawingMode(drawingMode === 'point' ? 'none' : 'point')} title="Sketch Core Pin Marker" style={{ width: '22px', height: '22px', backgroundColor: drawingMode === 'point' ? '#2563eb' : '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>📍</button>
              <button onClick={() => setDrawingMode(drawingMode === 'circle' ? 'none' : 'circle')} title="Draw Safety Impact Circle" style={{ width: '22px', height: '22px', backgroundColor: drawingMode === 'circle' ? '#2563eb' : '#1f1f23', border: '1px solid #3f3f46', color: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>◯</button>
            </div>

            {/* HIGH FIDELITY GEOSPATIAL MAP CANVAS */}
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 45 }} width={600} height={300} style={{ width: '100%', height: '100%' }}>
              <ZoomableGroup zoom={mapState.zoom} center={mapState.center} onMoveEnd={(position) => setMapState(position)}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography 
                        key={geo.rsmKey} 
                        geography={geo} 
                        fill={basemapMode === 'dark' ? "#141416" : "#cbd5e1"} 
                        stroke={basemapMode === 'dark' ? "#222226" : "#94a3b8"} 
                        strokeWidth={0.5} 
                        style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }} 
                      />
                    ))
                  }
                </Geographies>
                {filteredData.slice(0, 180).map((d) => (
                  <Marker key={d.id} coordinates={[d.longitude, d.latitude]}>
                    <circle 
                      r={selectedEvent?.id === d.id ? 5 : Math.max(d.mag * 0.4, 1.8)} 
                      fill={selectedEvent?.id === d.id ? '#f59e0b' : '#2563eb'} 
                      fillOpacity={selectedEvent?.id === d.id ? 0.95 : 0.6}
                      stroke={selectedEvent?.id === d.id ? '#ffffff' : 'none'}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedEvent(d);
                        setIsFocalMode(true); 
                      }}
                    />
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>

            {/* FIXED INTERACTIVE VECTOR CAD SKETCHING OVERLAY CONTAINER */}
            <svg 
              width="100%" 
              height="100%" 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                pointerEvents: drawingMode !== 'none' ? 'auto' : 'none',
                cursor: drawingMode !== 'none' ? 'crosshair' : 'default',
                zIndex: 40
              }} 
              onClick={handleVectorOverlayDraw}
            >
              {drawnShapes.map((shape) => (
                <g key={shape.id}>
                  {shape.type === 'point' && (
                    <circle cx={shape.x} cy={shape.y} r={5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                  )}
                  {shape.type === 'circle' && (
                    <circle cx={shape.x} cy={shape.y} r={30} fill="#ef444420" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" />
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* PANEL 2: GIS TELEMETRY FIELD INSPECTOR */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>5. GIS Telemetry Inspector</h3>
          {selectedEvent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', backgroundColor: '#111111', padding: '6px', borderRadius: '6px', border: '1px solid #27272a', flexGrow: 1, justifyContent: 'center' }}>
              <div><span style={{ color: '#71717a', fontSize: '8px', textTransform: 'uppercase' }}>Feature Location</span><div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedEvent.place}</div></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><span style={{ color: '#71717a', fontSize: '8px' }}>Magnitude Metric</span><div style={{ fontSize: '11px', fontWeight: '900', color: '#2563eb' }}>{selectedEvent.mag} {selectedEvent.magType}</div></div>
                <div><span style={{ color: '#71717a', fontSize: '8px' }}>Hypocentral Depth</span><div style={{ fontSize: '11px', fontWeight: '900', color: '#ef4444' }}>{selectedEvent.depth?.toFixed(1)} km</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #27272a', paddingTop: '2px' }}>
                <div><span style={{ color: '#71717a', fontSize: '8px' }}>Tsunami Trigger</span><div style={{ fontSize: '9px', fontWeight: 'bold', color: selectedEvent.tsunami === 'Yes' ? '#10b981' : '#a1a1aa' }}>{selectedEvent.tsunami}</div></div>
                <div><span style={{ color: '#71717a', fontSize: '8px' }}>PAGER Tier</span><div style={{ fontSize: '9px', fontWeight: 'bold', color: '#f59e0b', textTransform: 'uppercase' }}>{selectedEvent.alert || 'green'}</div></div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#71717a', fontSize: '10px', textAlign: 'center', marginTop: '20px' }}>Select an active spatial vector node.</div>
          )}
        </div>

        {/* PANEL 3: CONTINENTAL DISTRIBUTION VECTOR CHART */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Spatial Continent Share</h3>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BarChart width={200} height={100} data={continentData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis type="number" stroke="#52525b" fontSize={7} />
              <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={7} width={65} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '8px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 2, 2, 0]} barSize={6} />
            </BarChart>
          </div>
        </div>

        {/* PANEL 4: PAGER RISK PROPORTIONS DOUGHNUT */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>PAGER Alert Levels Proportion</h3>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <PieChart width={140} height={100}>
              <Pie data={pagerData} dataKey="value" cx="50%" cy="50%" innerRadius={18} outerRadius={32} paddingAngle={3}>
                {pagerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'red' ? '#ef4444' : entry.name === 'orange' ? '#f97316' : entry.name === 'yellow' ? '#facc15' : '#22c55e'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '8px', background: '#000', borderColor: '#222' }} />
            </PieChart>
          </div>
        </div>

        {/* PANEL 5: EVENT SIGNIFICANCE ANALYSIS HISTOGRAM */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>USGS Event Significance Scores</h3>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BarChart width={200} height={100} data={significanceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#52525b" fontSize={6} tick={false} />
              <YAxis stroke="#52525b" fontSize={7} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '8px' }} />
              <Bar dataKey="score" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={10} />
            </BarChart>
          </div>
        </div>

        {/* PANEL 6: CHRONOLOGICAL AREA TIMELINE CHART */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Temporal Event Trends (By Year)</h3>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AreaChart width={220} height={100} data={yearData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="year" stroke="#71717a" fontSize={7} />
              <YAxis stroke="#71717a" fontSize={7} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '8px' }} />
              <Area type="monotone" dataKey="count" stroke="#2563eb" fill="#1d4ed8" fillOpacity={0.15} strokeWidth={1} />
            </AreaChart>
          </div>
        </div>

        {/* PANEL 7: STRUCTURAL HYPOCENTRAL DEPTH HISTOGRAM */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Depth Bins Histogram</h3>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BarChart width={220} height={100} data={depthData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="bin" stroke="#71717a" fontSize={7} />
              <YAxis stroke="#71717a" fontSize={7} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '8px' }} />
              <Bar dataKey="count" fill="#2563eb" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="count" position="top" fill="#a1a1aa" fontSize={7} />
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* PANEL 8: TOTAL EVENT COUNTS BY MAGNITUDE VALUE */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Earthquakes by Magnitude</h3>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BarChart width={220} height={100} data={magData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="mag" stroke="#52525b" fontSize={7} />
              <YAxis stroke="#52525b" fontSize={7} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '8px' }} />
              <Bar dataKey="count" fill="#2563eb" radius={[2, 2, 0, 0]}>
                {magData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.mag >= 7.0 ? '#3b82f6' : '#1d4ed8'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* PANEL 9: REGULAR SEASONAL MONTH DISTRIBUTION CHART */}
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f23', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Seasonal Distribution (By Month)</h3>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BarChart width={220} height={100} data={monthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={7} tickFormatter={(str) => str.substring(0, 3)} />
              <YAxis stroke="#71717a" fontSize={7} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '8px' }} />
              <Bar dataKey="count" fill="#2563eb" radius={[1.5, 1.5, 0, 0]} />
            </BarChart>
          </div>
        </div>

      </div>
    </div>
  );
}