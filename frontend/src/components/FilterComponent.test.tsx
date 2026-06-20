import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterComponent } from './FilterComponent';

const defaultProps = {
  countries: ['India', 'USA'],
  cities: [
    { city: 'Delhi', country: 'India' },
    { city: 'Mumbai', country: 'India' },
    { city: 'New York', country: 'USA' },
  ],
  selectedCountry: null,
  selectedCity: null,
  selectedPollutionType: 'aqi',
  selectedDays: 30,
  selectedDateRangeStart: null,
  selectedDateRangeEnd: null,
  onCountryChange: jest.fn(),
  onCityChange: jest.fn(),
  onPollutionTypeChange: jest.fn(),
  onDaysChange: jest.fn(),
  onDateRangeStartChange: jest.fn(),
  onDateRangeEndChange: jest.fn(),
  onGenerateStory: jest.fn(),
  loading: false,
};

describe('FilterComponent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all country options', () => {
    render(<FilterComponent {...defaultProps} />);
    expect(screen.getByRole('option', { name: 'India' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'USA' })).toBeInTheDocument();
  });

  it('disables city select when no country is selected', () => {
    render(<FilterComponent {...defaultProps} selectedCountry={null} />);
    // selects order: Country, City, Pollution Type, Time Period
    const [, citySelect] = screen.getAllByRole('combobox');
    expect(citySelect).toBeDisabled();
  });

  it('enables city select when a country is selected', () => {
    render(<FilterComponent {...defaultProps} selectedCountry="India" />);
    const [, citySelect] = screen.getAllByRole('combobox');
    expect(citySelect).not.toBeDisabled();
  });

  it('shows only cities belonging to the selected country', () => {
    render(<FilterComponent {...defaultProps} selectedCountry="India" />);
    expect(screen.getByRole('option', { name: 'Delhi' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mumbai' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'New York' })).not.toBeInTheDocument();
  });

  it('calls onCountryChange with the selected value', () => {
    render(<FilterComponent {...defaultProps} />);
    const [countrySelect] = screen.getAllByRole('combobox');
    fireEvent.change(countrySelect, { target: { value: 'India' } });
    expect(defaultProps.onCountryChange).toHaveBeenCalledWith('India');
  });

  it('calls onCountryChange with null when "All Countries" is selected', () => {
    render(<FilterComponent {...defaultProps} selectedCountry="India" />);
    const [countrySelect] = screen.getAllByRole('combobox');
    fireEvent.change(countrySelect, { target: { value: '' } });
    expect(defaultProps.onCountryChange).toHaveBeenCalledWith(null);
  });

  it('calls onDaysChange with the correct value when a day button is clicked', () => {
    render(<FilterComponent {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(defaultProps.onDaysChange).toHaveBeenCalledWith(7);

    fireEvent.click(screen.getByRole('button', { name: '90 days' }));
    expect(defaultProps.onDaysChange).toHaveBeenCalledWith(90);
  });

  it('calls onGenerateStory when the generate button is clicked', () => {
    render(<FilterComponent {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate Data Story' }));
    expect(defaultProps.onGenerateStory).toHaveBeenCalledTimes(1);
  });

  it('disables the generate button and shows loading text while loading', () => {
    render(<FilterComponent {...defaultProps} loading={true} />);
    const btn = screen.getByRole('button', { name: 'Generating Story...' });
    expect(btn).toBeDisabled();
  });

  it('switches to date range inputs when date range mode is selected', () => {
    render(<FilterComponent {...defaultProps} />);
    const comboboxes = screen.getAllByRole('combobox');
    // Last combobox is the Time Period mode selector
    fireEvent.change(comboboxes[comboboxes.length - 1], { target: { value: 'daterange' } });
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.queryByText('7 days')).not.toBeInTheDocument();
  });

  it('switches back to day buttons when days mode is re-selected', () => {
    render(<FilterComponent {...defaultProps} />);
    const comboboxes = screen.getAllByRole('combobox');
    const modePicker = comboboxes[comboboxes.length - 1];

    fireEvent.change(modePicker, { target: { value: 'daterange' } });
    fireEvent.change(modePicker, { target: { value: 'days' } });

    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  });

  it('renders all 5 day-range buttons', () => {
    render(<FilterComponent {...defaultProps} />);
    for (const label of ['7 days', '14 days', '30 days', '60 days', '90 days']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });
});
