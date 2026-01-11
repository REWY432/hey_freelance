import React from 'react';
import { Proposal } from '../types';
import { openTelegramChat, triggerHaptic } from '../services/telegram';
import { User, MessageSquare, ExternalLink, Calendar } from 'lucide-react';
import { ProposalsListSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

// Avatar helper
const getAvatarUrl = (name: string) => {
  const seed = encodeURIComponent(name || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=3b82f6,8b5cf6,10b981,f97316&backgroundType=gradientLinear`;
};

interface ProposalsListProps {
  proposals: Proposal[];
  jobTitle: string;
  onClose: () => void;
  isLoading?: boolean;
}

const ProposalsList: React.FC<ProposalsListProps> = ({ proposals, jobTitle, onClose, isLoading = false }) => {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur flex justify-between items-center shrink-0 safe-area-top">
            <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Отклики на заказ</div>
                <h2 className="text-lg font-bold text-white line-clamp-1 pr-4">{jobTitle}</h2>
            </div>
            <button 
                onClick={() => { triggerHaptic('light'); onClose(); }}
                className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-bold text-slate-300 hover:text-white active:scale-95 transition-transform"
            >
                Закрыть
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {isLoading ? (
                <ProposalsListSkeleton count={2} />
            ) : proposals.length === 0 ? (
                <EmptyState type="no-proposals" />
            ) : (
                proposals.map((prop, index) => (
                    <div 
                      key={prop.id} 
                      className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg stagger-item"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <img 
                                  src={getAvatarUrl(prop.freelancer?.displayName || 'User')}
                                  alt={prop.freelancer?.displayName}
                                  className="w-10 h-10 rounded-full"
                                  loading="lazy"
                                />
                                <div>
                                    <h3 className="font-bold text-white text-sm">{prop.freelancer?.displayName || 'Unknown User'}</h3>
                                    {prop.freelancer?.username && (
                                        <div className="text-xs text-blue-400">@{prop.freelancer.username}</div>
                                    )}
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(prop.createdAt).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Cover Letter Bubble */}
                        <div className="bg-slate-900/50 p-3 rounded-xl rounded-tl-none border border-slate-700/50 text-sm text-slate-300 leading-relaxed whitespace-pre-line mb-4">
                            {prop.coverLetter}
                        </div>

                        {/* Skills if available */}
                        {prop.freelancer?.skills && prop.freelancer.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {prop.freelancer.skills.slice(0, 3).map(skill => (
                                    <span key={skill} className="px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-400">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => prop.freelancer?.username ? openTelegramChat(prop.freelancer.username) : alert('Username скрыт')}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <ExternalLink size={16} />
                            НАПИСАТЬ В TELEGRAM
                        </button>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default ProposalsList;