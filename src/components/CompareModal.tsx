'use client';

import { X, Star, Phone, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ProgramRow, Program } from '@/lib/types';
import { formatCost, formatAgeRange, formatSchedule, formatSchoolYear } from '@/lib/sample-data';

interface CompareModalProps {
  rows: ProgramRow[];
  onClose: () => void;
}

export default function CompareModal({ rows, onClose }: CompareModalProps) {
  if (rows.length === 0) return null;

  const EnrollmentBadge = ({ status }: { status: Program['enrollmentStatus'] }) => {
    if (status === 'open') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Open
        </span>
      );
    }
    if (status === 'waitlist') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3" />
          Waitlist
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <XCircle className="w-3 h-3" />
        Closed
      </span>
    );
  };

  // Comparison attributes
  const attributes = [
    { 
      label: 'Distance', 
      getValue: (row: ProgramRow) => row.facility.distanceMiles ? `${row.facility.distanceMiles.toFixed(1)} mi` : '—',
      category: 'location'
    },
    { 
      label: 'Neighborhood', 
      getValue: (row: ProgramRow) => row.facility.neighborhood || '—',
      category: 'location'
    },
    { 
      label: 'Rating', 
      getValue: (row: ProgramRow) => row.facility.rating ? (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-medium">{row.facility.rating}</span>
          <span className="text-gray-400 text-xs">({row.facility.reviewCount})</span>
        </div>
      ) : <span className="text-gray-400">No reviews</span>,
      category: 'location'
    },
    { 
      label: 'Age Range', 
      getValue: (row: ProgramRow) => formatAgeRange(row.program.ageMinMonths, row.program.ageMaxMonths),
      category: 'program'
    },
    { 
      label: 'Schedule', 
      getValue: (row: ProgramRow) => formatSchedule(row.program),
      category: 'program'
    },
    { 
      label: 'Days Offered', 
      getValue: (row: ProgramRow) => row.program.daysOffered.join(', '),
      category: 'program'
    },
    { 
      label: 'Program Hours', 
      getValue: (row: ProgramRow) => `${row.program.startTime} - ${row.program.endTime}`,
      category: 'program'
    },
    { 
      label: 'Facility Hours', 
      getValue: (row: ProgramRow) => row.facility.operatingHours 
        ? `${row.facility.operatingHours.open} - ${row.facility.operatingHours.close}` 
        : '—',
      category: 'program'
    },
    { 
      label: 'Cost', 
      getValue: (row: ProgramRow) => (
        <div>
          <div className="font-medium">{formatCost(row.program.costAmount, row.program.costPeriod)}</div>
          {row.program.costNotes && <div className="text-xs text-gray-500">{row.program.costNotes}</div>}
        </div>
      ),
      category: 'cost'
    },
    { 
      label: 'Enrollment', 
      getValue: (row: ProgramRow) => <EnrollmentBadge status={row.program.enrollmentStatus} />,
      category: 'enrollment'
    },
    { 
      label: 'Deadline', 
      getValue: (row: ProgramRow) => row.program.enrollmentDeadline || '—',
      category: 'enrollment'
    },
    { 
      label: 'School Year', 
      getValue: (row: ProgramRow) => formatSchoolYear(row.program),
      category: 'enrollment'
    },
    { 
      label: 'Spots Available', 
      getValue: (row: ProgramRow) => row.program.spotsAvailable !== undefined 
        ? (
          <span className={row.program.spotsAvailable > 0 ? 'text-green-600' : 'text-red-600'}>
            {row.program.spotsAvailable} of {row.program.spotsTotal}
          </span>
        ) : '—',
      category: 'enrollment'
    },
    { 
      label: 'Transportation', 
      getValue: (row: ProgramRow) => row.facility.hasTransportation ? '✓ Yes' : '✗ No',
      category: 'features'
    },
    { 
      label: 'Meals Provided', 
      getValue: (row: ProgramRow) => row.facility.mealsProvided ? '✓ Yes' : '✗ No',
      category: 'features'
    },
    { 
      label: 'Languages', 
      getValue: (row: ProgramRow) => row.facility.languages?.join(', ') || 'English',
      category: 'features'
    },
    { 
      label: 'Special Programs', 
      getValue: (row: ProgramRow) => row.facility.specialPrograms?.length 
        ? (
          <div className="flex flex-wrap gap-1">
            {row.facility.specialPrograms.map(p => (
              <span key={p} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{p}</span>
            ))}
          </div>
        ) : '—',
      category: 'features'
    },
    { 
      label: 'Phone', 
      getValue: (row: ProgramRow) => row.facility.phone 
        ? <a href={`tel:${row.facility.phone}`} className="text-blue-600 hover:underline">{row.facility.phone}</a>
        : '—',
      category: 'contact'
    },
    { 
      label: 'Website', 
      getValue: (row: ProgramRow) => row.facility.website 
        ? (
          <a href={row.facility.website} target="_blank" rel="noopener noreferrer" 
             className="text-blue-600 hover:underline flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Visit
          </a>
        ) : '—',
      category: 'contact'
    },
    { 
      label: 'Address', 
      getValue: (row: ProgramRow) => `${row.facility.address}, ${row.facility.city} ${row.facility.zip}`,
      category: 'contact'
    },
  ];

  const categoryLabels: Record<string, string> = {
    location: 'Location & Rating',
    program: 'Program Schedule',
    cost: 'Cost',
    enrollment: 'Enrollment',
    features: 'Features',
    contact: 'Contact',
  };

  const categories = ['location', 'program', 'cost', 'enrollment', 'features', 'contact'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            Compare Programs ({rows.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 w-40 bg-white">
                  Attribute
                </th>
                {rows.map((row) => (
                  <th key={`${row.facilityId}-${row.programId}`} className="text-left px-4 py-3 min-w-[220px] bg-white">
                    <div className="font-semibold text-gray-900">{row.facility.name}</div>
                    <div className="text-sm font-normal text-blue-600">{row.program.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <>
                  <tr key={`cat-${category}`} className="bg-blue-50">
                    <td colSpan={rows.length + 1} className="px-4 py-2 text-xs font-semibold text-blue-800 uppercase">
                      {categoryLabels[category]}
                    </td>
                  </tr>
                  {attributes
                    .filter(attr => attr.category === category)
                    .map((attr, idx) => (
                      <tr key={attr.label} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-700">{attr.label}</td>
                        {rows.map((row) => (
                          <td key={`${row.facilityId}-${row.programId}-${attr.label}`} className="px-4 py-2 text-sm text-gray-600">
                            {attr.getValue(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
