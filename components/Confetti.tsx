import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

interface ConfettiProps {
  isActive: boolean;
  duration?: number; // How long to show confetti (ms)
  particleCount?: number;
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
];

const Confetti: React.FC<ConfettiProps> = ({ 
  isActive, 
  duration = 3000,
  particleCount = 50 
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!isActive) {
      setPieces([]);
      return;
    }

    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // Random horizontal position (%)
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 500, // Random start delay (ms)
      duration: 2000 + Math.random() * 2000, // Random fall duration (ms)
      size: 6 + Math.random() * 8, // Random size (px)
    }));

    setPieces(newPieces);

    // Clear confetti after duration
    const timeout = setTimeout(() => {
      setPieces([]);
    }, duration);

    return () => clearTimeout(timeout);
  }, [isActive, duration, particleCount]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0"
          style={{
            left: `${piece.x}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: piece.id % 2 === 0 ? '50%' : '2px',
            animation: `confetti-fall ${piece.duration}ms linear ${piece.delay}ms forwards`,
            opacity: 0.9,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Confetti;
