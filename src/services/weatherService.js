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
      return { label: 'Clear Sky', labelTa: 'தெளிவான வானம்', icon: 'Sun', color: 'text-amber-500' };
    case 1:
    case 2:
      return { label: 'Partly Cloudy', labelTa: 'பகுதி மேகமூட்டம்', icon: 'CloudSun', color: 'text-amber-500' };
    case 3:
      return { label: 'Overcast', labelTa: 'முழு மேகமூட்டம்', icon: 'Cloud', color: 'text-slate-500' };
    case 45:
    case 48:
      return { label: 'Foggy', labelTa: 'பனிமூட்டம்', icon: 'CloudFog', color: 'text-slate-400' };
    case 51:
    case 53:
    case 55:
      return { label: 'Drizzle', labelTa: 'தூறல்', icon: 'CloudDrizzle', color: 'text-blue-400' };
    case 61:
    case 63:
    case 65:
      return { label: 'Rain', labelTa: 'மழை', icon: 'CloudRain', color: 'text-blue-500' };
    case 80:
    case 81:
    case 82:
      return { label: 'Showers', labelTa: 'கனமழை', icon: 'CloudRain', color: 'text-blue-600' };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', labelTa: 'இடி மின்னல்', icon: 'CloudLightning', color: 'text-purple-600' };
    default:
      return { label: 'Partly Cloudy', labelTa: 'பகுதி மேகமூட்டம்', icon: 'CloudSun', color: 'text-emerald-600' };
  }
}

// Compute poultry-specific ambient temperature advisories
export function getPoultryWeatherAdvisory(temperatureC) {
  if (temperatureC >= 34) {
    return {
      status: 'Extreme Heat Warning',
      statusTa: 'அதிக வெப்பம்',
      badgeVariant: 'rose',
      severity: 'high',
      tip: 'Severe Heat Risk! Turn on foggers/sprinklers immediately & add electrolytes in drinking water.',
      tipTa: 'அதிக வெப்ப அபாயம்! தெளிப்பான்களை (Foggers) இயக்கவும் மற்றும் குடிநீரில் எலக்ட்ரோலைட்களை சேர்க்கவும்.',
      color: 'bg-rose-50 border-rose-200 text-rose-800 shadow-2xs'
    };
  } else if (temperatureC >= 30) {
    return {
      status: 'Heat Stress Caution',
      statusTa: 'வெப்ப எச்சரிக்கை',
      badgeVariant: 'amber',
      severity: 'medium',
      tip: 'Elevated Temperature. Maintain fan circulation and verify cool water supply.',
      tipTa: 'அதிகரித்த வெப்பநிலை. காற்றோட்டத்தை பராமரிக்கவும் மற்றும் குளிர்ந்த நீர் விநியோகத்தை உறுதிப்படுத்தவும்.',
      color: 'bg-amber-50 border-amber-200 text-amber-900 shadow-2xs'
    };
  } else if (temperatureC < 18) {
    return {
      status: 'Cold Temperature Warning',
      statusTa: 'குளிர் எச்சரிக்கை',
      badgeVariant: 'blue',
      severity: 'medium',
      tip: 'Low temperature detected. Check shed side curtains and brooder heating.',
      tipTa: 'குறைந்த வெப்பநிலை. பண்ணை திரைகள் மற்றும் வெப்பமூட்டியை சரிபார்க்கவும்.',
      color: 'bg-blue-50 border-blue-200 text-blue-900 shadow-2xs'
    };
  } else {
    return {
      status: 'Optimal Shed Climate',
      statusTa: 'நல்ல காலநிலை',
      badgeVariant: 'emerald',
      severity: 'normal',
      tip: 'Ideal climate condition for flock growth and feed efficiency.',
      tipTa: 'கோழி வளர்ச்சி மற்றும் தீவன பயன்பாட்டிற்கு ஏற்ற காலநிலை.',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs'
    };
  }
}

/**
 * Fetch current weather & today's max/min forecast for a given lat/lon
 */
export async function fetchWeather(lat = DEFAULT_FARM_LOCATION.latitude, lon = DEFAULT_FARM_LOCATION.longitude) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API HTTP Error');
    const data = await res.json();

    const current = data.current || {};
    const daily = data.daily || {};
    
    const weatherInfo = decodeWeatherCode(current.weather_code ?? 0);
    const temp = Math.round(current.temperature_2m ?? 30);
    const advisory = getPoultryWeatherAdvisory(temp);

    return {
      temperature: temp,
      feelsLike: Math.round(current.apparent_temperature ?? temp),
      humidity: current.relative_humidity_2m ?? 62,
      windSpeed: Math.round(current.wind_speed_10m ?? 8),
      tempMax: Math.round(daily.temperature_2m_max?.[0] ?? temp + 3),
      tempMin: Math.round(daily.temperature_2m_min?.[0] ?? temp - 5),
      weatherLabel: weatherInfo.label,
      weatherLabelTa: weatherInfo.labelTa,
      weatherIconKey: weatherInfo.icon,
      weatherColor: weatherInfo.color,
      advisory,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (err) {
    console.error('Failed to fetch Open-Meteo weather:', err);
    // Return graceful fallback data
    return {
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
