import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[110] bg-rose-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top duration-300 safe-area-top">
      <WifiOff size={16} />
      <span>Нет подключения к интернету</span>
    </div>
  );
};

export default OfflineBanner;
