import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudFog, 
  CloudDrizzle, 
  CloudRain, 
  CloudLightning, 
  MapPin, 
  RefreshCw, 
  Search, 
  Wind, 
  Droplets, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  Navigation,
  X 
} from 'lucide-react';
import { fetchWeather, searchVillageLocation, DEFAULT_FARM_LOCATION, getPoultryWeatherAdvisory } from '../../services/weatherService';
import { Badge } from './Badge';

const ICON_MAP = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning
};

const LOCATION_STORAGE_KEY = 'kg_poultry_farm_weather_location';
const WEATHER_CACHE_KEY = 'kg_poultry_farm_weather_cache';

const INITIAL_FALLBACK_WEATHER = {
  temperature: 31,
  feelsLike: 35,
  humidity: 62,
  windSpeed: 8,
  tempMax: 34,
  tempMin: 24,
  weatherLabel: 'Partly Cloudy',
  weatherLabelTa: 'பகுதி மேகமூட்டம்',
  weatherIconKey: 'CloudSun',
  weatherColor: 'text-amber-500',
  advisory: getPoultryWeatherAdvisory(31),
  updatedAt: 'Live'
};

export const WeatherWidget = () => {
  const { language, t } = useLanguage();
  const [location, setLocation] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_FARM_LOCATION;
    } catch {
      return DEFAULT_FARM_LOCATION;
    }
  });

  const [weather, setWeather] = useState(() => {
    try {
      const saved = localStorage.getItem(WEATHER_CACHE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_FALLBACK_WEATHER;
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadWeatherData();
  }, [location]);

  async function loadWeatherData() {
    setRefreshing(true);
    const data = await fetchWeather(location.latitude, location.longitude);
    if (data) {
      setWeather(data);
      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
      } catch (e) {}
    }
    setLoading(false);
    setRefreshing(false);
  }

  function handleSaveLocation(newLoc) {
    const locObj = {
      name: newLoc.displayName || newLoc.name,
      latitude: newLoc.latitude,
      longitude: newLoc.longitude
    };
    setLocation(locObj);
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locObj));
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchVillageLocation(searchQuery);
    setSearchResults(results);
    setSearching(false);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const locObj = {
          name: 'My Live Location',
          latitude,
          longitude
        };
        setLocation(locObj);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locObj));
        setSearching(false);
        setShowSearchModal(false);
      },
      (err) => {
        console.error(err);
        alert('Could not access current location. Please search for your village name.');
        setSearching(false);
      }
    );
  }

  const WeatherIcon = weather && ICON_MAP[weather.weatherIconKey] ? ICON_MAP[weather.weatherIconKey] : CloudSun;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="space-y-1">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
      </div>
    );
  }

  const advisory = weather?.advisory;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:shadow-md">
      {/* Top accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-teal-400" />

      <div className="p-5">
        {/* Header: Village location & Refresh button */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[140px] sm:max-w-xs">
              {location.name}
            </span>
            <button
              onClick={() => setShowSearchModal(true)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 ml-0.5 shrink-0"
            >
              {t('changeLocation')}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
              {weather?.updatedAt}
            </span>
            <button
              onClick={loadWeatherData}
              disabled={refreshing}
              title="Refresh weather"
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Main Weather Display */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-2xs">
              <WeatherIcon className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {weather?.temperature}°C
                </span>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {t('feelsLike')} {weather?.feelsLike}°C
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600">
                {language === 'ta' && (weather?.weatherLabelTa || weatherInfo?.labelTa) ? (weather.weatherLabelTa || weatherInfo?.labelTa) : weather?.weatherLabel} • H: {weather?.tempMax}°C L: {weather?.tempMin}°C
              </p>
            </div>
          </div>

          {/* Quick Metrics (Humidity & Wind) */}
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 border border-slate-100 p-2.5 sm:px-4">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('humidity')}</p>
                <p className="text-xs font-bold text-slate-800">{weather?.humidity}%</p>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-teal-600" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('wind')}</p>
                <p className="text-xs font-bold text-slate-800">{weather?.windSpeed} km/h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Poultry Advisory Banner */}
        {advisory && (
          <div className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 ${advisory.color}`}>
            {advisory.severity === 'high' || advisory.severity === 'medium' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            )}
            <div className="text-xs flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
                <span className="font-extrabold">{language === 'ta' && advisory.statusTa ? advisory.statusTa : advisory.status}</span>
                <Badge variant={advisory.badgeVariant}>{t('liveAdvisory')}</Badge>
              </div>
              <p className="mt-1 font-medium leading-relaxed opacity-90">{language === 'ta' && advisory.tipTa ? advisory.tipTa : advisory.tip}</p>
            </div>
          </div>
        )}
      </div>

      {/* Village Location Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Farm Village Location</h3>
              </div>
              <button 
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter village, taluk, or district name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  {searching ? 'Searching Open-Meteo...' : 'Search Location'}
                </button>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  title="Use current GPS location"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Navigation className="h-3.5 w-3.5 text-emerald-600" />
                  GPS
                </button>
              </div>
            </form>

            {/* Quick preset for Thathayangarpatty */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-[11px] font-bold uppercase text-slate-400">Default Farm Village Preset:</p>
              <button
                onClick={() => handleSaveLocation(DEFAULT_FARM_LOCATION)}
                className="mt-1.5 w-full flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-left text-xs font-bold text-emerald-900 hover:bg-emerald-100"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Thathayangarpatty, Namakkal, Tamil Nadu</span>
                </div>
                <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-extrabold">Select</span>
              </button>
            </div>

            {/* Search Results list */}
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold uppercase text-slate-400">Search Results:</p>
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSaveLocation(res)}
                    className="w-full text-left rounded-xl p-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 flex items-center justify-between"
                  >
                    <span>{res.displayName || res.name}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
