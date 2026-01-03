import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { triggerHaptic } from '../services/telegram';
import { JobCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { Check, RotateCcw } from 'lucide-react';

interface FilterState {
  category: JobCategory;
  budgetMin: string;
  budgetMax: string;
  sortBy: 'date' | 'budget' | 'popular';
  onlyUrgent: boolean;
  onlyWithBudget: boolean;
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({ 
  isOpen, 
  onClose, 
  filters: initialFilters,
  onApply 
}) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const handleReset = () => {
    triggerHaptic('light');
    setFilters({
      category: JobCategory.ALL,
      budgetMin: '',
      budgetMax: '',
      sortBy: 'date',
      onlyUrgent: false,
      onlyWithBudget: false
    });
  };

  const handleApply = () => {
    triggerHaptic('medium');
    onApply(filters);
    onClose();
  };

  const sortOptions = [
    { key: 'date', label: 'По дате' },
    { key: 'budget', label: 'По бюджету' },
    { key: 'popular', label: 'По откликам' },
  ];

  const budgetPresets = ['5000', '15000', '30000', '50000', '100000'];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Фильтры"
      maxHeight="90vh"
    >
      <div className="p-5 space-y-6">
        
        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Категория
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CATEGORY_LABELS) as JobCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  triggerHaptic('selection');
                  setFilters(f => ({ ...f, category: cat }));
                }}
                className={`p-3 rounded-xl text-sm font-medium text-left transition-all ${
                  filters.category === cat
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 border'
                    : 'bg-slate-800 border-slate-700 text-slate-300 border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{CATEGORY_LABELS[cat]}</span>
                  {filters.category === cat && <Check size={16} />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Бюджет (₽)
          </label>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <input
                type="number"
                placeholder="От"
                value={filters.budgetMin}
                onChange={(e) => setFilters(f => ({ ...f, budgetMin: e.target.value }))}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl
                          text-white placeholder-slate-500 text-sm outline-none
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center text-slate-600">—</div>
            <div className="flex-1">
              <input
                type="number"
                placeholder="До"
                value={filters.budgetMax}
                onChange={(e) => setFilters(f => ({ ...f, budgetMax: e.target.value }))}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl
                          text-white placeholder-slate-500 text-sm outline-none
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Budget presets */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {budgetPresets.map(preset => (
              <button
                key={preset}
                onClick={() => {
                  triggerHaptic('selection');
                  setFilters(f => ({ ...f, budgetMax: preset }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  filters.budgetMax === preset
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                до {Number(preset).toLocaleString()} ₽
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Сортировка
          </label>
          <div className="flex gap-2">
            {sortOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  triggerHaptic('selection');
                  setFilters(f => ({ ...f, sortBy: opt.key as FilterState['sortBy'] }));
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  filters.sortBy === opt.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Дополнительно
          </label>
          
          <button
            onClick={() => {
              triggerHaptic('selection');
              setFilters(f => ({ ...f, onlyUrgent: !f.onlyUrgent }));
            }}
            className="w-full flex items-center justify-between p-4 bg-slate-800 
                      border border-slate-700 rounded-xl"
          >
            <span className="text-sm text-white">🔥 Только срочные</span>
            <div className={`w-10 h-6 rounded-full transition-colors relative ${
              filters.onlyUrgent ? 'bg-blue-600' : 'bg-slate-600'
            }`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                filters.onlyUrgent ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </div>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setFilters(f => ({ ...f, onlyWithBudget: !f.onlyWithBudget }));
            }}
            className="w-full flex items-center justify-between p-4 bg-slate-800 
                      border border-slate-700 rounded-xl"
          >
            <span className="text-sm text-white">💰 С указанным бюджетом</span>
            <div className={`w-10 h-6 rounded-full transition-colors relative ${
              filters.onlyWithBudget ? 'bg-blue-600' : 'bg-slate-600'
            }`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                filters.onlyWithBudget ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleReset}
            className="flex-1 py-3.5 bg-slate-800 border border-slate-700 rounded-xl
                      text-slate-300 font-medium flex items-center justify-center gap-2
                      active:scale-[0.98] transition-transform"
          >
            <RotateCcw size={16} />
            Сбросить
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3.5 bg-blue-600 rounded-xl
                      text-white font-bold flex items-center justify-center gap-2
                      active:scale-[0.98] transition-transform"
          >
            <Check size={16} />
            Применить
          </button>
        </div>

        {/* Safe area */}
        <div className="h-4" />
      </div>
    </BottomSheet>
  );
};

export default FilterSheet;
