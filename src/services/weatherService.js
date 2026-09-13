/**
 * Weather Service using Open-Meteo Free Public API
 * No API Key required.
 */

export const DEFAULT_FARM_LOCATION = {
  name: 'Thathayangarpatty, Namakkal',
  district: 'Namakkal',
  state: 'Tamil Nadu',
  latitude: 11.22126,
  longitude: 78.16524
};

// Map WMO Weather Codes to human-readable text and icon keys
export function decodeWeatherCode(code) {
  switch (code) {
    case 0:
      return { label: 'Clear Sky', icon: 'Sun', color: 'text-amber-500' };
    case 1:
    case 2:
      return { label: 'Partly Cloudy', icon: 'CloudSun', color: 'text-amber-500' };
    case 3:
      return { label: 'Overcast', icon: 'Cloud', color: 'text-slate-500' };
    case 45:
    case 48:
      return { label: 'Foggy', icon: 'CloudFog', color: 'text-slate-400' };
    case 51:
    case 53:
    case 55:
      return { label: 'Drizzle', icon: 'CloudDrizzle', color: 'text-blue-400' };
    case 61:
    case 63:
    case 65:
      return { label: 'Rain', icon: 'CloudRain', color: 'text-blue-500' };
    case 80:
    case 81:
    case 82:
      return { label: 'Showers', icon: 'CloudRain', color: 'text-blue-600' };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', icon: 'CloudLightning', color: 'text-purple-600' };
    default:
      return { label: 'Partly Cloudy', icon: 'CloudSun', color: 'text-emerald-600' };
  }
}

// Compute poultry-specific ambient temperature advisories
export function getPoultryWeatherAdvisory(temperatureC) {
  if (temperatureC >= 34) {
    return {
      status: 'Extreme Heat Warning',
      badgeVariant: 'rose',
      severity: 'high',
      tip: 'Severe Heat Risk! Turn on foggers/sprinklers immediately & add electrolytes in drinking water.',
      color: 'bg-rose-50 border-rose-200 text-rose-800 shadow-2xs'
    };
  } else if (temperatureC >= 30) {
    return {
      status: 'Heat Stress Caution',
      badgeVariant: 'amber',
      severity: 'medium',
      tip: 'Elevated Temperature. Maintain fan circulation and verify cool water supply.',
      color: 'bg-amber-50 border-amber-200 text-amber-900 shadow-2xs'
    };
  } else if (temperatureC < 18) {
    return {
      status: 'Cold Temperature Warning',
      badgeVariant: 'blue',
      severity: 'medium',
      tip: 'Low temperature detected. Check shed side curtains and brooder heating.',
      color: 'bg-blue-50 border-blue-200 text-blue-900 shadow-2xs'
    };
  } else {
    return {
      status: 'Optimal Shed Climate',
      badgeVariant: 'emerald',
      severity: 'normal',
      tip: 'Ideal climate condition for flock growth and feed efficiency.',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs'
    };
  }
}

/**
 * Fetch current weather & today's max/min forecast for a given lat/lon
 */
export async function fetchWeather(lat = DEFAULT_FARM_LOCATION.latitude, lon = DEFAULT_FARM_LOCATION.longitude) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API HTTP Error');
    const data = await res.json();

    const current = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};
    
    const weatherInfo = decodeWeatherCode(current.weather_code ?? 0);
    const temp = Math.round(current.temperature_2m ?? 30);
    const advisory = getPoultryWeatherAdvisory(temp);

    // Extract next 7 hours forecast starting from current hour
    const times = hourly.time || [];
    const temps = hourly.temperature_2m || [];
    const codes = hourly.weather_code || [];
    const rainProbs = hourly.precipitation_probability || [];

    const now = new Date();
    const currentISO = now.toISOString().slice(0, 13); // e.g. "2026-09-13T10"
    let startIndex = times.findIndex(t => t.startsWith(currentISO));
    if (startIndex === -1) {
      startIndex = Math.max(0, now.getHours());
    }

    const next7Hours = [];
    for (let i = 0; i < 7; i++) {
      const idx = startIndex + i;
      if (idx < times.length) {
        const rawTime = times[idx];
        const dateObj = new Date(rawTime);
        const formattedHour = i === 0 ? 'Now' : dateObj.toLocaleTimeString([], { hour: 'numeric', hour12: true });
        const hTemp = Math.round(temps[idx] ?? temp);
        const hCode = codes[idx] ?? 0;
        const hWeather = decodeWeatherCode(hCode);
        const hRain = Math.round(rainProbs[idx] ?? 0);

        next7Hours.push({
          time: formattedHour,
          temp: hTemp,
          weatherLabel: hWeather.label,
          weatherIconKey: hWeather.icon,
          weatherColor: hWeather.color,
          rainProb: hRain,
          isHot: hTemp >= 32
        });
      }
    }

    return {
      temperature: temp,
      feelsLike: Math.round(current.apparent_temperature ?? temp),
      humidity: current.relative_humidity_2m ?? 62,
      windSpeed: Math.round(current.wind_speed_10m ?? 8),
      tempMax: Math.round(daily.temperature_2m_max?.[0] ?? temp + 3),
      tempMin: Math.round(daily.temperature_2m_min?.[0] ?? temp - 5),
      weatherLabel: weatherInfo.label,
      weatherIconKey: weatherInfo.icon,
      weatherColor: weatherInfo.color,
      advisory,
      next7Hours,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (err) {
    console.error('Failed to fetch Open-Meteo weather:', err);
    // Return graceful fallback data
    const currentHour = new Date().getHours();
    const fallback7Hours = Array.from({ length: 7 }, (_, i) => {
      const h = (currentHour + i) % 24;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const hTemp = 30 + Math.round(Math.sin(i) * 3);
      return {
        time: i === 0 ? 'Now' : `${displayH} ${ampm}`,
        temp: hTemp,
        weatherLabel: 'Partly Cloudy',
        weatherIconKey: 'CloudSun',
        weatherColor: 'text-amber-500',
        rainProb: 10,
        isHot: hTemp >= 32
      };
    });

    return {
      temperature: 31,
      feelsLike: 35,
      humidity: 62,
      windSpeed: 8,
      tempMax: 34,
      tempMin: 24,
      weatherLabel: 'Partly Cloudy',
      weatherIconKey: 'CloudSun',
      weatherColor: 'text-amber-500',
      advisory: getPoultryWeatherAdvisory(31),
      next7Hours: fallback7Hours,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }
}

/**
 * Search village/town name via Open-Meteo Geocoding API
 */
export async function searchVillageLocation(query) {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const cleanQuery = query.trim();
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      return data.results.map(r => ({
        name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}`,
        displayName: `${r.name}, ${r.admin1 || 'Tamil Nadu'}`,
        latitude: r.latitude,
        longitude: r.longitude,
        district: r.admin2 || r.name
      }));
    }

    // Fallback: if village isn't in global geocoding DB, return Namakkal district coords with village name label
    return [
      {
        name: `${cleanQuery}, Namakkal`,
        displayName: `${cleanQuery}, Namakkal, Tamil Nadu`,
        latitude: DEFAULT_FARM_LOCATION.latitude,
        longitude: DEFAULT_FARM_LOCATION.longitude,
        district: 'Namakkal'
      }
    ];
  } catch (err) {
    console.error('Village search failed:', err);
    return [];
  }
}
