import { describe, it, expect } from 'vitest';
import { decodeWeatherCode, getPoultryWeatherAdvisory, DEFAULT_FARM_LOCATION } from './weatherService';

describe('weatherService', () => {
  it('should have default farm village location set to Thathayangarpatty, Namakkal', () => {
    expect(DEFAULT_FARM_LOCATION.name).toContain('Thathayangarpatty, Namakkal');
    expect(DEFAULT_FARM_LOCATION.latitude).toBeCloseTo(11.22126);
    expect(DEFAULT_FARM_LOCATION.longitude).toBeCloseTo(78.16524);
  });

  it('should decode WMO weather codes correctly', () => {
    expect(decodeWeatherCode(0).label).toBe('Clear Sky');
    expect(decodeWeatherCode(3).label).toBe('Overcast');
    expect(decodeWeatherCode(63).label).toBe('Rain');
    expect(decodeWeatherCode(95).label).toBe('Thunderstorm');
  });

  it('should compute appropriate poultry climate advisories', () => {
    // Normal temperature (25°C)
    const normal = getPoultryWeatherAdvisory(25);
    expect(normal.status).toBe('Optimal Shed Climate');
    expect(normal.severity).toBe('normal');

    // Heat stress caution (31°C)
    const heatCaution = getPoultryWeatherAdvisory(31);
    expect(heatCaution.status).toBe('Heat Stress Caution');
    expect(heatCaution.severity).toBe('medium');

    // Extreme heat warning (36°C)
    const extremeHeat = getPoultryWeatherAdvisory(36);
    expect(extremeHeat.status).toBe('Extreme Heat Warning');
    expect(extremeHeat.severity).toBe('high');

    // Cold temperature warning (15°C)
    const cold = getPoultryWeatherAdvisory(15);
    expect(cold.status).toBe('Cold Temperature Warning');
    expect(cold.severity).toBe('medium');
  });
});
