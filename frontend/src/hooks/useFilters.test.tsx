import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { FilterProvider, useFilters } from './useFilters';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FilterProvider>{children}</FilterProvider>
);

describe('useFilters', () => {
  it('has correct initial state', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.country).toBeNull();
    expect(result.current.city).toBeNull();
    expect(result.current.pollutionType).toBe('aqi');
    expect(result.current.days).toBe(30);
    expect(result.current.dateRangeStart).toBeNull();
    expect(result.current.dateRangeEnd).toBeNull();
  });

  it('setCountry updates country', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => { result.current.setCountry('India'); });
    expect(result.current.country).toBe('India');
  });

  it('setCity updates city', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => { result.current.setCity('Delhi'); });
    expect(result.current.city).toBe('Delhi');
  });

  it('setPollutionType updates pollutionType', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => { result.current.setPollutionType('pm25'); });
    expect(result.current.pollutionType).toBe('pm25');
  });

  it('setDays updates days', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => { result.current.setDays(7); });
    expect(result.current.days).toBe(7);
  });

  it('setDateRangeStart and setDateRangeEnd update dates', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.setDateRangeStart('2026-01-01');
      result.current.setDateRangeEnd('2026-01-31');
    });
    expect(result.current.dateRangeStart).toBe('2026-01-01');
    expect(result.current.dateRangeEnd).toBe('2026-01-31');
  });

  it('resetFilters restores all defaults', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.setCountry('India');
      result.current.setCity('Delhi');
      result.current.setPollutionType('pm25');
      result.current.setDays(7);
      result.current.setDateRangeStart('2026-01-01');
      result.current.setDateRangeEnd('2026-01-31');
    });

    act(() => { result.current.resetFilters(); });

    expect(result.current.country).toBeNull();
    expect(result.current.city).toBeNull();
    expect(result.current.pollutionType).toBe('aqi');
    expect(result.current.days).toBe(30);
    expect(result.current.dateRangeStart).toBeNull();
    expect(result.current.dateRangeEnd).toBeNull();
  });

  it('throws when used outside FilterProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useFilters())).toThrow(
      'useFilters must be used within FilterProvider'
    );
    consoleError.mockRestore();
  });
});
