import React from 'react';
import { FreelancerProfile } from '../types';
import { openTelegramChat } from '../services/telegram';
import { User, ExternalLink, Sparkles, Link as LinkIcon } from 'lucide-react';

interface FreelancersPageProps {
  freelancers: FreelancerProfile[];
}

const FreelancersPage: React.FC<FreelancersPageProps> = ({ freelancers }) => {

  const openLink = (url: string) => {
    // Simple logic to ensure protocol exists
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    window.Telegram?.WebApp?.openLink(finalUrl);
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-2">
          <Sparkles className="text-yellow-400" size={20} />
          <h1 className="text-2xl font-bold text-white">Топ Исполнители</h1>
      </div>

      {freelancers.map((profile) => (
        <div 
          key={profile.userId}
          className="rounded-2xl p-5 bg-slate-800/80 border border-slate-700 backdrop-blur-sm flex flex-col gap-4 shadow-md"
        >
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <User size={24} />
                </div>
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-white truncate">
                        {profile.displayName}
                    </h3>
                    {profile.username && (
                        <p className="text-xs text-blue-400 font-mono">@{profile.username}</p>
                    )}
                </div>
                {profile.username && (
                    <button 
                    onClick={() => openTelegramChat(profile.username!)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        <ExternalLink size={18} />
                    </button>
                )}
                </div>

                <p className="text-sm mt-3 text-slate-300 line-clamp-3 leading-relaxed">
                {profile.bio}
                </p>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-3">
             {/* Skills */}
             <div className="flex flex-wrap gap-2 mb-3">
              {profile.skills.map(skill => (
                <span 
                    key={skill}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300 border border-slate-600"
                >
                    {skill}
                </span>
              ))}
            </div>

            {/* Portfolio Links */}
            {profile.portfolioLinks && profile.portfolioLinks.length > 0 && (
                <div className="flex flex-col gap-2">
                    {profile.portfolioLinks.map((link, idx) => (
                        <button 
                            key={idx}
                            onClick={() => openLink(link)}
                            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 truncate w-full"
                        >
                            <LinkIcon size={12} className="flex-shrink-0" />
                            <span className="truncate">{link}</span>
                        </button>
                    ))}
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FreelancersPage;