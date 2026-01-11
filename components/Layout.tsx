import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { initTelegramApp, getTelegramUser, triggerHaptic } from '../services/telegram';
import { ADMIN_IDS } from '../constants';
import { Briefcase, UserCircle, PlusCircle, List, Shield, ShoppingBag, X, FileText, Package, Bell } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  unreadNotifications?: number;
  onNavigateToObject?: (view: ViewState, id?: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  setView,
  unreadNotifications = 0,
  onNavigateToObject
}) => {
  const user = getTelegramUser();
  const isAdmin = ADMIN_IDS.includes(user.id);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    initTelegramApp();
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.setHeaderColor('#0f172a');
      window.Telegram.WebApp.setBackgroundColor('#0f172a');
    }
  }, []);

  const handleCreateClick = () => {
    triggerHaptic('medium');
    setShowCreateMenu(true);
  };

  const handleCreateOption = (view: ViewState) => {
    triggerHaptic('light');
    setShowCreateMenu(false);
    setView(view);
  };

  const NavItem = ({ view, icon: Icon, label, onClick }: { 
    view?: ViewState; 
    icon: any; 
    label: string;
    onClick?: () => void;
  }) => {
    const isActive = view ? currentView === view : false;
    
    const handleClick = () => {
      if (onClick) {
        onClick();
      } else if (view) {
        setView(view);
      }
    };
    
    return (
      <button
        onClick={handleClick}
        className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative ${
          isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-500/10' : ''}`}>
           <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className={`text-[9px] mt-0.5 font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
          {label}
        </span>
        {isActive && (
            <span className="absolute top-0 w-6 h-0.5 bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[80px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[80px]"></div>
      </div>

      {/* Header Bar with Notification Bell */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-end px-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <button
          onClick={() => {
            triggerHaptic('light');
            setShowNotifications(true);
          }}
          className="relative p-3 bg-slate-800/90 hover:bg-slate-700 rounded-2xl 
                   border border-slate-700/50 shadow-lg transition-all
                   active:scale-95 touch-target"
        >
          <Bell size={20} className="text-slate-300" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 
                           bg-blue-500 rounded-full text-[11px] font-bold text-white
                           flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]
                           animate-bounce-in">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 relative custom-scrollbar z-10">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-4 left-4 right-4 h-14 rounded-2xl flex justify-around items-center z-50 border border-white/5 shadow-2xl backdrop-blur-xl bg-slate-800/80 safe-area-bottom"
      >
        {/* Заказы (для исполнителей) */}
        <NavItem view={ViewState.JOBS} icon={List} label="Заказы" />
        
        {/* Услуги (для заказчиков) */}
        <NavItem view={ViewState.SERVICES} icon={ShoppingBag} label="Услуги" />
        
        {/* Создать - с меню выбора */}
        <NavItem 
          icon={PlusCircle} 
          label="Создать" 
          onClick={handleCreateClick}
        />
        
        {/* Профиль */}
        <NavItem view={ViewState.PROFILE} icon={UserCircle} label="Профиль" />
        
        {/* Админ (только для админов) */}
        {isAdmin && (
            <NavItem view={ViewState.ADMIN} icon={Shield} label="Админ" />
        )}
      </nav>

      {/* Create Menu (ActionSheet) */}
      {showCreateMenu && (
        <div 
          className="fixed inset-0 z-[70] flex items-end justify-center"
          onClick={() => setShowCreateMenu(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
          
          {/* Menu */}
          <div 
            className="relative w-full max-w-lg mx-3 mb-20 bg-slate-800 rounded-2xl border border-slate-700 
                       shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Что создать?</h3>
              <button 
                onClick={() => setShowCreateMenu(false)}
                className="p-2 bg-slate-700 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Options */}
            <div className="p-3 space-y-2">
              {/* Создать заказ */}
              <button
                onClick={() => handleCreateOption(ViewState.CREATE_JOB)}
                className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl 
                          flex items-center gap-4 transition-all active:scale-[0.98]
                          border border-slate-600/50 hover:border-blue-500/50 group"
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center
                              group-hover:bg-blue-500/30 transition-colors">
                  <FileText className="text-blue-400" size={24} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white">Заказ</div>
                  <div className="text-xs text-slate-400">
                    Найти исполнителя для задачи
                  </div>
                </div>
              </button>

              {/* Создать услугу */}
              <button
                onClick={() => handleCreateOption(ViewState.CREATE_SERVICE)}
                className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl 
                          flex items-center gap-4 transition-all active:scale-[0.98]
                          border border-slate-600/50 hover:border-emerald-500/50 group"
              >
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center
                              group-hover:bg-emerald-500/30 transition-colors">
                  <Package className="text-emerald-400" size={24} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white">Услуга</div>
                  <div className="text-xs text-slate-400">
                    Предложить свои навыки клиентам
                  </div>
                </div>
              </button>
            </div>

            {/* Tip */}
            <div className="px-4 pb-4">
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400">
                  💡 <b className="text-slate-300">Заказ</b> — если вам нужен исполнитель.
                  <br />
                  💡 <b className="text-slate-300">Услуга</b> — если вы предлагаете услуги.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Center Drawer */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user.id}
        onNavigate={onNavigateToObject}
      />
    </div>
  );
};

export default Layout;
