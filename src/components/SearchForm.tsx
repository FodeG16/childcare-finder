'use client';

import { useState } from 'react';
import { Search, MapPin, SlidersHorizontal, X } from 'lucide-react';
import { FacilityType, SearchFilters } from '@/lib/types';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

const facilityTypeOptions: { value: FacilityType; label: string }[] = [
  { value: 'daycare', label: 'Daycare' },
  { value: 'home-daycare', label: 'Home Daycare' },
  { value: 'preschool', label: 'Preschool' },
  { value: 'montessori', label: 'Montessori' },
  { value: 'pre-k', label: 'Pre-K' },
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: 'elementary', label: 'Elementary' },
];

const ageOptions = [
  { value: 3, label: '0-3 months (Newborn)' },
  { value: 6, label: '3-6 months' },
  { value: 12, label: '6-12 months (Infant)' },
  { value: 18, label: '12-18 months (Toddler)' },
  { value: 24, label: '18-24 months' },
  { value: 36, label: '2-3 years' },
  { value: 48, label: '3-4 years (Preschool)' },
  { value: 60, label: '4-5 years (Pre-K)' },
  { value: 72, label: '5-6 years (Kindergarten)' },
];

export default function SearchForm({ onSearch }: SearchFormProps) {
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<FacilityType[]>([]);
  const [childAge, setChildAge] = useState<number | undefined>();
  const [maxCost, setMaxCost] = useState<number | undefined>();
  const [minDays, setMinDays] = useState<number | undefined>();
  const [maxDays, setMaxDays] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [openEnrollmentOnly, setOpenEnrollmentOnly] = useState(false);

  const handleTypeToggle = (type: FacilityType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSearch = () => {
    onSearch({
      address,
      radiusMiles: radius,
      facilityTypes: selectedTypes,
      childAgeMonths: childAge,
      maxCostMonthly: maxCost,
      minDaysPerWeek: minDays,
      maxDaysPerWeek: maxDays,
      enrollmentOpen: openEnrollmentOnly,
    });
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setChildAge(undefined);
    setMaxCost(undefined);
    setMinDays(undefined);
    setMaxDays(undefined);
    setOpenEnrollmentOnly(false);
  };

  const activeFilterCount = [
    selectedTypes.length > 0,
    childAge !== undefined,
    maxCost !== undefined,
    minDays !== undefined || maxDays !== undefined,
    openEnrollmentOnly,
  ].filter(Boolean).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6">
      {/* Main search row */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address or Zip Code
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your address or zip code"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Radius
          </label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value={1}>1 mile</option>
            <option value={2}>2 miles</option>
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={15}>15 miles</option>
          </select>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">Filter Results</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Facility types */}
            <div className="lg:col-span-2">
              <label className="block text-sm text-gray-600 mb-2">
                Facility Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {facilityTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTypeToggle(option.value)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedTypes.includes(option.value)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Child's age */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Child's Age
              </label>
              <select
                value={childAge ?? ''}
                onChange={(e) => setChildAge(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full py-1.5 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Any age</option>
                {ageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Max cost */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Max Monthly Cost
              </label>
              <select
                value={maxCost ?? ''}
                onChange={(e) => setMaxCost(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full py-1.5 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Any price</option>
                <option value={1000}>Under $1,000/mo</option>
                <option value={1500}>Under $1,500/mo</option>
                <option value={2000}>Under $2,000/mo</option>
                <option value={2500}>Under $2,500/mo</option>
                <option value={3000}>Under $3,000/mo</option>
              </select>
            </div>

            {/* Days per week */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Days per Week
              </label>
              <div className="flex gap-2">
                <select
                  value={minDays ?? ''}
                  onChange={(e) => setMinDays(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 py-1.5 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Min</option>
                  <option value={2}>2+</option>
                  <option value={3}>3+</option>
                  <option value={4}>4+</option>
                  <option value={5}>5</option>
                </select>
                <select
                  value={maxDays ?? ''}
                  onChange={(e) => setMaxDays(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 py-1.5 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Max</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom row - checkboxes */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={openEnrollmentOnly}
                onChange={(e) => setOpenEnrollmentOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Currently accepting enrollment</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
