import React from 'react';

// Базовый shimmer-эффект
const shimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";

// Skeleton для карточки заказа
export const JobCardSkeleton: React.FC = () => (
  <div className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 ${shimmerClass}`}>
    {/* Header */}
    <div className="flex justify-between items-start mb-3">
      <div className="flex flex-col gap-2 flex-1 pr-14">
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 bg-slate-700 rounded" />
          <div className="h-4 w-12 bg-slate-700 rounded" />
        </div>
        <div className="h-5 w-3/4 bg-slate-700 rounded mt-1" />
      </div>
      <div className="flex gap-1">
        <div className="w-9 h-9 bg-slate-700 rounded-full" />
        <div className="w-9 h-9 bg-slate-700 rounded-full" />
      </div>
    </div>
    
    {/* Description */}
    <div className="space-y-2 mb-5">
      <div className="h-3 w-full bg-slate-700 rounded" />
      <div className="h-3 w-5/6 bg-slate-700 rounded" />
      <div className="h-3 w-4/6 bg-slate-700 rounded" />
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
      <div className="flex flex-col gap-1">
        <div className="h-4 w-20 bg-slate-700 rounded" />
        <div className="h-3 w-16 bg-slate-700 rounded" />
      </div>
      <div className="h-10 w-28 bg-slate-700 rounded-lg" />
    </div>
  </div>
);

// Skeleton для карточки услуги
export const ServiceCardSkeleton: React.FC = () => (
  <div className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden ${shimmerClass}`}>
    <div className="p-4">
      {/* Category + Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-16 bg-slate-700 rounded" />
        <div className="h-5 w-20 bg-slate-700 rounded-full" />
      </div>

      {/* Title */}
      <div className="h-5 w-4/5 bg-slate-700 rounded mb-3" />

      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-slate-700 rounded" />
        <div className="h-3 w-3/4 bg-slate-700 rounded" />
      </div>

      {/* Features */}
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-20 bg-slate-700 rounded-lg" />
        <div className="h-6 w-24 bg-slate-700 rounded-lg" />
        <div className="h-6 w-16 bg-slate-700 rounded-lg" />
      </div>
    </div>

    <div className="border-t border-slate-700/50" />

    {/* Footer */}
    <div className="p-4 bg-slate-800/30">
      <div className="flex items-center justify-between">
        {/* Freelancer */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full" />
          <div className="flex flex-col gap-1">
            <div className="h-4 w-24 bg-slate-700 rounded" />
            <div className="h-3 w-16 bg-slate-700 rounded" />
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="h-5 w-20 bg-slate-700 rounded mb-1" />
          <div className="h-3 w-12 bg-slate-700 rounded" />
        </div>
      </div>

      {/* Button */}
      <div className="w-full h-12 bg-slate-700 rounded-xl mt-4" />
    </div>
  </div>
);

// Компактный skeleton для услуги (grid view)
export const ServiceCardCompactSkeleton: React.FC = () => (
  <div className={`bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden ${shimmerClass}`}>
    <div className="p-3">
      <div className="h-2.5 w-14 bg-slate-700 rounded mb-2" />
      <div className="h-4 w-full bg-slate-700 rounded mb-1" />
      <div className="h-4 w-3/4 bg-slate-700 rounded mb-3" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-slate-700 rounded-full" />
        <div className="h-3 w-16 bg-slate-700 rounded" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="h-4 w-16 bg-slate-700 rounded" />
          <div className="h-2.5 w-10 bg-slate-700 rounded" />
        </div>
        <div className="h-8 w-16 bg-slate-700 rounded-lg" />
      </div>
    </div>
  </div>
);

// Список skeleton-карточек заказов
export const JobListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <JobCardSkeleton key={i} />
    ))}
  </div>
);

// Список skeleton-карточек услуг
export const ServiceListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <ServiceCardSkeleton key={i} />
    ))}
  </div>
);

// Grid skeleton для услуг
export const ServiceGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <ServiceCardCompactSkeleton key={i} />
    ))}
  </div>
);

export default {
  JobCardSkeleton,
  ServiceCardSkeleton,
  ServiceCardCompactSkeleton,
  JobListSkeleton,
  ServiceListSkeleton,
  ServiceGridSkeleton
};

