'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  ExternalLink, 
  Phone, 
  MapPin,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2,
  GitCompare
} from 'lucide-react';
import { Facility, Program, ProgramRow, ColumnKey, ALL_COLUMNS } from '@/lib/types';
import { 
  formatAgeRange, 
  formatCost, 
  formatSchedule,
} from '@/lib/sample-data';
import ColumnSelector from './ColumnSelector';

interface ResultsTableProps {
  facilities: Facility[];
  isLoading?: boolean;
  onCompare: (rows: ProgramRow[]) => void;
}

type SortField = 'name' | 'distance' | 'cost' | 'rating' | 'programs';
type SortDirection = 'asc' | 'desc';

export default function ResultsTable({ facilities, isLoading, onCompare }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('distance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedFacilities, setExpandedFacilities] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set<ColumnKey>(['name', 'type', 'distance', 'ages', 'programSchedule', 'programHours', 'programCost', 'enrollmentStatus', 'rating'])
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const totalPrograms = useMemo(() => 
    facilities.reduce((sum, f) => sum + f.programs.length, 0), 
    [facilities]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedFacilities = useMemo(() => {
    return [...facilities].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'distance':
          comparison = (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999);
          break;
        case 'cost':
          const minCostA = Math.min(...a.programs.map(p => p.costAmount ?? 999999));
          const minCostB = Math.min(...b.programs.map(p => p.costAmount ?? 999999));
          comparison = minCostA - minCostB;
          break;
        case 'rating':
          comparison = (b.rating ?? 0) - (a.rating ?? 0);
          break;
        case 'programs':
          comparison = b.programs.length - a.programs.length;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [facilities, sortField, sortDirection]);

  const toggleFacilityExpand = (facilityId: string) => {
    setExpandedFacilities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(facilityId)) {
        newSet.delete(facilityId);
      } else {
        newSet.add(facilityId);
      }
      return newSet;
    });
  };

  const toggleRowSelection = (rowKey: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else if (newSet.size < 4) {
        newSet.add(rowKey);
      }
      return newSet;
    });
  };

  const handleCompareClick = () => {
    const selectedProgramRows: ProgramRow[] = [];
    facilities.forEach(facility => {
      facility.programs.forEach(program => {
        const key = `${facility.id}-${program.id}`;
        if (selectedRows.has(key)) {
          selectedProgramRows.push({ facilityId: facility.id, programId: program.id, facility, program });
        }
      });
    });
    onCompare(selectedProgramRows);
  };

  const expandAll = () => setExpandedFacilities(new Set(facilities.map(f => f.id)));
  const collapseAll = () => setExpandedFacilities(new Set());

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const EnrollmentBadge = ({ status }: { status: Program['enrollmentStatus'] }) => {
    if (status === 'open') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 whitespace-nowrap">
          <CheckCircle2 className="w-2.5 h-2.5" />Open
        </span>
      );
    }
    if (status === 'waitlist') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700 whitespace-nowrap">
          <Clock className="w-2.5 h-2.5" />Waitlist
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
        <XCircle className="w-2.5 h-2.5" />Closed
      </span>
    );
  };

  const getFacilitySummary = (facility: Facility) => {
    const programs = facility.programs;
    const minAge = Math.min(...programs.map(p => p.ageMinMonths));
    const maxAge = Math.max(...programs.map(p => p.ageMaxMonths));
    
    // Find the lowest cost program and use its period
    const programsWithCost = programs.filter(p => p.costAmount !== null);
    let minCostProgram: Program | null = null;
    let maxCostProgram: Program | null = null;
    
    if (programsWithCost.length > 0) {
      // Sort by normalized monthly cost to find min/max
      const sorted = [...programsWithCost].sort((a, b) => {
        const aCost = a.costPeriod === 'yearly' ? (a.costAmount! / 12) : a.costAmount!;
        const bCost = b.costPeriod === 'yearly' ? (b.costAmount! / 12) : b.costAmount!;
        return aCost - bCost;
      });
      minCostProgram = sorted[0];
      maxCostProgram = sorted[sorted.length - 1];
    }
    
    const hasOpen = programs.some(p => p.enrollmentStatus === 'open');
    const hasWaitlist = programs.some(p => p.enrollmentStatus === 'waitlist');
    return { minAge, maxAge, minCostProgram, maxCostProgram, hasOpen, hasWaitlist };
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Searching...</p>
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No facilities found. Try adjusting your search.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-gray-600">
            <b>{facilities.length}</b> facilities · <b>{totalPrograms}</b> programs
          </span>
          <span className="text-gray-300">|</span>
          <button onClick={expandAll} className="text-blue-600 hover:underline">Expand all</button>
          <button onClick={collapseAll} className="text-blue-600 hover:underline">Collapse</button>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size >= 2 && (
            <button onClick={handleCompareClick} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
              <GitCompare className="w-3 h-3" />Compare ({selectedRows.size})
            </button>
          )}
          <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
            <Settings2 className="w-3 h-3" />Columns
          </button>
        </div>
      </div>

      {showColumnSelector && (
        <ColumnSelector visibleColumns={visibleColumns} onChange={setVisibleColumns} onClose={() => setShowColumnSelector(false)} />
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-6 px-1 py-1.5"></th>
              <th className="w-5 px-0.5 py-1.5"></th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700 min-w-[140px]">
                <button onClick={() => handleSort('name')} className="flex items-center gap-0.5 hover:text-gray-900">
                  Facility / Program<SortIcon field="name" />
                </button>
              </th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">Type</th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">
                <button onClick={() => handleSort('distance')} className="flex items-center gap-0.5 hover:text-gray-900">
                  Dist<SortIcon field="distance" />
                </button>
              </th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">Ages</th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">Schedule</th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">Hours</th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">
                <button onClick={() => handleSort('cost')} className="flex items-center gap-0.5 hover:text-gray-900">
                  Cost<SortIcon field="cost" />
                </button>
              </th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">Status</th>
              <th className="text-left px-1.5 py-1.5 font-semibold text-gray-700">
                <button onClick={() => handleSort('rating')} className="flex items-center gap-0.5 hover:text-gray-900">
                  Rating<SortIcon field="rating" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedFacilities.map((facility) => {
              const isExpanded = expandedFacilities.has(facility.id);
              const summary = getFacilitySummary(facility);

              return (
                <>
                  {/* Facility row */}
                  <tr key={facility.id} className="bg-white hover:bg-gray-50 cursor-pointer" onClick={() => toggleFacilityExpand(facility.id)}>
                    <td className="px-1 py-1.5 text-center">
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </td>
                    <td className="px-0.5 py-1.5"></td>
                    <td className="px-1.5 py-1.5">
                      <div className="font-medium text-gray-900 leading-tight">{facility.name}</div>
                      <div className="text-[10px] text-gray-500">{facility.neighborhood}</div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <div className="flex flex-wrap gap-0.5">
                        {facility.facilityTypes.slice(0, 2).map((t) => (
                          <span key={t} className="px-1 py-0.5 text-[10px] rounded bg-gray-100 text-gray-600 capitalize">{t.replace('-', ' ')}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5 text-gray-600 whitespace-nowrap">{facility.distanceMiles?.toFixed(1)}mi</td>
                    <td className="px-1.5 py-1.5 text-gray-600 whitespace-nowrap">{formatAgeRange(summary.minAge, summary.maxAge)}</td>
                    <td className="px-1.5 py-1.5 text-gray-500 italic">{facility.programs.length} prog</td>
                    <td className="px-1.5 py-1.5 text-gray-500 whitespace-nowrap">
                      {facility.operatingHours ? `${facility.operatingHours.open.replace(' ', '')}-${facility.operatingHours.close.replace(' ', '')}` : '—'}
                    </td>
                    <td className="px-1.5 py-1.5 text-gray-600 whitespace-nowrap">
                      {summary.minCostProgram !== null 
                        ? (summary.minCostProgram === summary.maxCostProgram 
                            ? formatCost(summary.minCostProgram.costAmount, summary.minCostProgram.costPeriod)
                            : `${formatCost(summary.minCostProgram.costAmount, summary.minCostProgram.costPeriod)}+`)
                        : 'Contact'
                      }
                    </td>
                    <td className="px-1.5 py-1.5">
                      {summary.hasOpen ? <span className="text-green-600 font-medium">Open</span> : summary.hasWaitlist ? <span className="text-yellow-600">Waitlist</span> : <span className="text-gray-400">Closed</span>}
                    </td>
                    <td className="px-1.5 py-1.5">
                      {facility.rating ? (
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{facility.rating}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>

                  {/* Program rows */}
                  {isExpanded && facility.programs.map((program) => {
                    const rowKey = `${facility.id}-${program.id}`;
                    const isSelected = selectedRows.has(rowKey);
                    return (
                      <tr key={rowKey} className={`${isSelected ? 'bg-blue-50' : 'bg-slate-50'} hover:bg-blue-100`}>
                        <td className="px-1 py-1"></td>
                        <td className="px-0.5 py-1" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleRowSelection(rowKey)} disabled={!isSelected && selectedRows.size >= 4} className="w-3 h-3 rounded border-gray-300 text-blue-600" />
                        </td>
                        <td className="px-1.5 py-1 pl-5 text-gray-700">{program.name}</td>
                        <td className="px-1.5 py-1"><span className="px-1 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700 capitalize">{program.type.replace('-', ' ')}</span></td>
                        <td className="px-1.5 py-1 text-gray-300">—</td>
                        <td className="px-1.5 py-1 text-gray-600 whitespace-nowrap">{formatAgeRange(program.ageMinMonths, program.ageMaxMonths)}</td>
                        <td className="px-1.5 py-1 text-gray-600 whitespace-nowrap">{formatSchedule(program)}</td>
                        <td className="px-1.5 py-1 text-gray-600 whitespace-nowrap">{program.startTime.replace(' ', '')}-{program.endTime.replace(' ', '')}</td>
                        <td className="px-1.5 py-1 text-gray-900 font-medium whitespace-nowrap">{formatCost(program.costAmount, program.costPeriod)}</td>
                        <td className="px-1.5 py-1"><EnrollmentBadge status={program.enrollmentStatus} /></td>
                        <td className="px-1.5 py-1 text-gray-400">{program.enrollmentDeadline ? <span className="text-orange-600 text-[10px]">{program.enrollmentDeadline}</span> : '—'}</td>
                      </tr>
                    );
                  })}

                  {/* Facility contact row */}
                  {isExpanded && (
                    <tr key={`${facility.id}-contact`} className="bg-blue-50/50 border-t border-blue-100">
                      <td colSpan={11} className="px-3 py-1.5">
                        <div className="flex flex-wrap gap-4 text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600"><MapPin className="w-3 h-3" />{facility.address}, {facility.city} {facility.zip}</span>
                          {facility.phone && <a href={`tel:${facility.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline"><Phone className="w-3 h-3" />{facility.phone}</a>}
                          {facility.website && <a href={facility.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}><ExternalLink className="w-3 h-3" />Website</a>}
                          {facility.mealsProvided && <span className="px-1 py-0.5 rounded bg-green-100 text-green-700">Meals</span>}
                          {facility.hasTransportation && <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">Transport</span>}
                          {facility.languages && facility.languages.length > 1 && <span className="text-gray-600">Languages: {facility.languages.join(', ')}</span>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRows.size > 0 && selectedRows.size < 2 && (
        <div className="px-2 py-1 bg-blue-50 border-t border-blue-100 text-[11px] text-blue-700">Select 2+ programs to compare</div>
      )}
    </div>
  );
}
