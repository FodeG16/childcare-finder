'use client';

import { useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { ColumnKey, ColumnConfig, ALL_COLUMNS } from '@/lib/types';

interface ColumnSelectorProps {
  visibleColumns: Set<ColumnKey>;
  onChange: (columns: Set<ColumnKey>) => void;
  onClose: () => void;
}

export default function ColumnSelector({ visibleColumns, onChange, onClose }: ColumnSelectorProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const toggleColumn = (key: ColumnKey) => {
    const newSet = new Set(visibleColumns);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    onChange(newSet);
  };

  const groupedColumns = ALL_COLUMNS.reduce((acc, col) => {
    if (!acc[col.category]) acc[col.category] = [];
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  const categoryLabels: Record<string, string> = {
    basic: 'Basic Info',
    program: 'Program Details',
    enrollment: 'Enrollment',
    features: 'Features',
  };

  const selectAll = () => {
    onChange(new Set(ALL_COLUMNS.map(c => c.key)));
  };

  const selectDefault = () => {
    onChange(new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key)));
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-4 top-12 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Show Columns</span>
        <div className="flex items-center gap-2">
          <button
            onClick={selectDefault}
            className="text-xs text-blue-600 hover:underline"
          >
            Default
          </button>
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:underline"
          >
            All
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {Object.entries(groupedColumns).map(([category, columns]) => (
          <div key={category} className="border-b border-gray-100 last:border-b-0">
            <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              {categoryLabels[category]}
            </div>
            {columns.map((col) => (
              <button
                key={col.key}
                onClick={() => toggleColumn(col.key)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                <span className={visibleColumns.has(col.key) ? 'text-gray-900' : 'text-gray-500'}>
                  {col.label}
                </span>
                {visibleColumns.has(col.key) && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
