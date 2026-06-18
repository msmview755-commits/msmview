import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import 'leaflet/dist/leaflet.css'

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const API = import.meta.env.VITE_API_URL
const CENTER = [21.1702, 72.8311] // Surat, Gujarat

const TYPE_COLORS = { traffic: '#e53e3e', construction: '#d69e2e', accident: '#dd6b20', closure: '#c53030', other: '#3182ce' }

const WMO_CODES = {
  0: { label: 'Clear Sky', icon: '☀️' },
  1: { label: 'Mainly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Rime Fog', icon: '🌫️' },
  51: { label: 'Light Drizzle', icon: '🌦️' },
  53: { label: 'Moderate Drizzle', icon: '🌦️' },
  55: { label: 'Dense Drizzle', icon: '🌧️' },
  61: { label: 'Slight Rain', icon: '🌧️' },
  63: { label: 'Moderate Rain', icon: '🌧️' },
  65: { label: 'Heavy Rain', icon: '🌧️' },
  71: { label: 'Slight Snow', icon: '🌨️' },
  73: { label: 'Moderate Snow', icon: '🌨️' },
  75: { label: 'Heavy Snow', icon: '❄️' },
  80: { label: 'Rain Showers', icon: '🌦️' },
  81: { label: 'Moderate Showers', icon: '🌧️' },
  82: { label: 'Violent Showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm + Hail', icon: '⛈️' },
  99: { label: 'Thunderstorm + Heavy Hail', icon: '⛈️' },
}

function PinDropper({ onDrop }) {
  useMapEvents({ click: e => onDrop(e.latlng) })
  return null
}

export default function Roads() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'super_admin'
  const [incidents, setIncidents] = useState([])
  const [dropping,  setDropping]  = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [pickedLoc, setPickedLoc] = useState(null)
  const [form, setForm] = useState({ title:'', type:'traffic', address:'', description:'' })
  
  // Weather states
  const [center, setCenter] = useState(CENTER)
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState(false)

  const fetchWeatherAndLocation = async (lat, lng) => {
    setWeatherLoading(true)
    setWeatherError(false)
    try {
      // 1. Fetch from Open-Meteo
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`
      const weatherRes = await axios.get(weatherUrl)
      const current = weatherRes.data.current

      // 2. Fetch City/Area from Nominatim (Reverse Geocoding)
      let city = ''
      try {
        const geoRes = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'msmview-dashboard/1.0' } }
        )
        const addr = geoRes.data.address
        city = addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || addr.county || 'Nearby Area'
        if (addr.state) {
          city += `, ${addr.state}`
        }
      } catch (e) {
        console.warn("Reverse geocoding failed, using fallback name.", e)
        const isNearSurat = Math.abs(lat - CENTER[0]) < 0.2 && Math.abs(lng - CENTER[1]) < 0.2
        city = isNearSurat ? 'Surat, Gujarat' : 'Nearby Area'
      }

      const code = current.weather_code
      const condition = WMO_CODES[code] || { label: 'Unknown', icon: '🌡️' }

      setWeather({
        temp: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        condition,
        city,
        lat,
        lng
      })
    } catch (err) {
      console.error("Failed to fetch weather", err)
      setWeatherError(true)
    } finally {
      setWeatherLoading(false)
    }
  }

  useEffect(() => {
    // Fetch incidents
    axios.get(`${API}/roads`).then(r => setIncidents(r.data)).catch(() => {})

    // Detect Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCenter([lat, lng])
          fetchWeatherAndLocation(lat, lng)
        },
        (error) => {
          console.warn("Geolocation access denied or failed. Falling back to Surat.", error)
          fetchWeatherAndLocation(CENTER[0], CENTER[1])
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    } else {
      fetchWeatherAndLocation(CENTER[0], CENTER[1])
    }
  }, [])

  // Auto-refresh weather every 10 minutes
  useEffect(() => {
    if (weatherLoading || !weather) return
    const interval = setInterval(() => {
      fetchWeatherAndLocation(center[0], center[1])
    }, 600000)
    return () => clearInterval(interval)
  }, [center])

  const handleDrop = (latlng) => {
    if (!dropping) return
    setPickedLoc(latlng)
    setDropping(false)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/roads`, { ...form, location: { lat: pickedLoc.lat, lng: pickedLoc.lng, address: form.address } })
      const r = await axios.get(`${API}/roads`)
      setIncidents(r.data)
      setShowForm(false)
      setPickedLoc(null)
      setForm({ title:'', type:'traffic', address:'', description:'' })
    } catch { alert('Error saving incident') }
  }

  return (
    <div>
      {/* Real-time Weather Widget */}
      <div className="weather-section mb-3">
        {weatherLoading ? (
          <div className="text-sm text-muted">Fetching local weather data...</div>
        ) : weatherError ? (
          <div className="text-sm text-muted">⚠️ Weather data currently unavailable.</div>
        ) : (
          <div className="weather-container">
            <div className="weather-main">
              <span className="weather-emoji">{weather.condition.icon}</span>
              <div>
                <h3 className="weather-temp">{Math.round(weather.temp)}°C</h3>
                <p className="weather-desc">{weather.condition.label}</p>
              </div>
            </div>
            <div className="weather-location-info">
              <div className="weather-city">{weather.city || 'Nearby Area'}</div>
              <div className="weather-coords">
                Lat: {weather.lat.toFixed(4)} · Lng: {weather.lng.toFixed(4)}
              </div>
            </div>
            <div className="weather-details">
              <div className="weather-detail-item">
                <span className="label">Feels Like</span>
                <span className="val">{Math.round(weather.feelsLike)}°C</span>
              </div>
              <div className="weather-detail-item">
                <span className="label">Humidity</span>
                <span className="val">{weather.humidity}%</span>
              </div>
              <div className="weather-detail-item">
                <span className="label">Wind</span>
                <span className="val">{weather.windSpeed} km/h</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-between mb-2">
        <div>
          <p className="text-sm text-muted">Live road situation — {incidents.length} active incidents</p>
        </div>
        <div className="flex-center gap-1">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setDropping(!dropping)}>
              {dropping ? 'Cancel Pin' : 'Add Incident'}
            </button>
          )}
        </div>
      </div>

      {dropping && (
        <div style={{ background:'#fef3c7', border:'1px solid #f59e0b', borderRadius:8, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.85rem', color:'#92400e' }}>
          Click anywhere on the map to drop a pin for the incident.
        </div>
      )}

      {/* Status bar */}
      <div className="flex-center gap-2 mb-2">
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:20, padding:'0.35rem 1rem', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#48bb78', display:'inline-block' }}></span>
          Main Highway: Clear
        </div>
        {incidents.filter(i => i.type === 'traffic').length > 0 && (
          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:20, padding:'0.35rem 1rem', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#fc8181', display:'inline-block' }}></span>
            {incidents.filter(i=>i.type==='traffic').length} Traffic Incident{incidents.filter(i=>i.type==='traffic').length>1?'s':''}
          </div>
        )}
      </div>

      <div className="map-wrapper" style={{ height:480 }}>
        <MapContainer key={`${center[0]}-${center[1]}`} center={center} zoom={13} style={{ height:'100%', width:'100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {dropping && <PinDropper onDrop={handleDrop} />}
          {incidents.map(inc => (
            <Marker key={inc._id} position={[inc.location.lat, inc.location.lng]}>
              <Popup>
                <strong><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:TYPE_COLORS[inc.type],marginRight:6}}></span>{inc.title}</strong><br />
                {inc.description}<br />
                <small style={{ color:'#718096' }}>
                  {inc.location.address && inc.location.address}<br />
                  Added: {new Date(inc.createdAt).toLocaleDateString()}
                </small>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Incident list below map */}
      {incidents.length > 0 && (
        <div className="card mt-2">
          <div className="fw-600 mb-2">Active Incidents</div>
          {incidents.map(inc => (
            <div key={inc._id} className="flex-between" style={{ padding:'0.6rem 0', borderBottom:'1px solid var(--border)', fontSize:'0.85rem' }}>
              <div>
                <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:TYPE_COLORS[inc.type],marginRight:6}}></span>
                <span className="fw-600">{inc.title}</span>
                {inc.location.address && <span className="text-muted"> · {inc.location.address}</span>}
              </div>
              <span className="badge badge-pending" style={{ textTransform:'capitalize' }}>{inc.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Incident Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Road Incident</h2>
            <p className="text-sm text-muted mb-3">
              Pin dropped at: {pickedLoc?.lat.toFixed(4)}, {pickedLoc?.lng.toFixed(4)}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input className="form-control" placeholder="e.g. Road construction on Main St" value={form.title} onChange={e => setForm({...form, title:e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                  <option value="traffic">Traffic</option>
                  <option value="construction">Construction</option>
                  <option value="accident">Accident</option>
                  <option value="closure">Closure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Address (optional)</label>
                <input className="form-control" placeholder="e.g. Ring Road, Surat" value={form.address} onChange={e => setForm({...form, address:e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={2} placeholder="Brief description" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
              </div>
              <div className="flex-between mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Incident</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
