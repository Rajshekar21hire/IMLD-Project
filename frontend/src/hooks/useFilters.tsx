import React, { createContext, useContext, useState, useCallback } from 'react';

interface FilterContextType {
  country: string | null;
  city: string | null;
  pollutionType: string;
  days: number | null;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  setCountry: (country: string | null) => void;
  setCity: (city: string | null) => void;
  setPollutionType: (type: string) => void;
  setDays: (days: number | null) => void;
  setDateRangeStart: (date: string | null) => void;
  setDateRangeEnd: (date: string | null) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [pollutionType, setPollutionType] = useState('aqi');
  const [days, setDays] = useState<number | null>(30);
  const [dateRangeStart, setDateRangeStart] = useState<string | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<string | null>(null);

  const resetFilters = useCallback(() => {
    setCountry(null);
    setCity(null);
    setPollutionType('aqi');
    setDays(30);
    setDateRangeStart(null);
    setDateRangeEnd(null);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        country,
        city,
        pollutionType,
        days,
        dateRangeStart,
        dateRangeEnd,
        setCountry,
        setCity,
        setPollutionType,
        setDays,
        setDateRangeStart,
        setDateRangeEnd,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
};
