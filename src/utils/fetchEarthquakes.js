// src/utils/fetchEarthquakes.js
export const fetchUSGSData = async () => {
  const url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=1900-01-01&minmagnitude=6.0";
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return data.features.map(f => {
      const date = new Date(f.properties.time);
      
      return {
        id: f.id,
        mag: f.properties.mag,
        magType: f.properties.magType,
        place: f.properties.place,
        year: date.getFullYear(),
        month: date.toLocaleString('default', { month: 'long' }),
        depth: f.geometry.coordinates[2],
        longitude: f.geometry.coordinates[0], // Clear mapping key for maps
        latitude: f.geometry.coordinates[1],  // Clear mapping key for maps
        tsunami: f.properties.tsunami === 1 ? "Yes" : "No",
        sigScore: f.properties.sig
      };
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};