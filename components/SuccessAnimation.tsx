import React from 'react';
import { Check } from 'lucide-react';

const SuccessAnimation: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1 + Math.random() * 1}s`
            }}
          />
        ))}
      </div>

      {/* Success checkmark */}
      <div className="relative animate-success-pop">
        {/* Glow ring */}
        <div className="absolute inset-0 w-24 h-24 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
        
        {/* Circle background */}
        <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50">
          {/* Inner ring */}
          <div className="absolute inset-2 border-4 border-white/20 rounded-full" />
          
          {/* Check icon */}
          <Check className="text-white" size={48} strokeWidth={3} />
        </div>
        
        {/* Sparkles */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
        <div className="absolute top-1/2 -right-4 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
};

export default SuccessAnimation;
