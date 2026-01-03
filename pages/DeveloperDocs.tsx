import React, { useState } from 'react';
import { BACKEND_DOCS } from '../constants';
import { getThemeParams } from '../services/telegram';
import { Copy, Database, Code, CreditCard, Bell, Terminal, Check } from 'lucide-react';

const CodeBlock = ({ title, code, icon: Icon, lang = 'sql' }: { title: string; code: string; icon: any, lang?: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="mb-8 rounded-lg overflow-hidden border border-gray-700 shadow-sm bg-slate-800">
      <div className="px-4 py-2 bg-slate-900 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Icon size={16} className="text-blue-400" />
          {title}
        </div>
        <button 
           onClick={handleCopy}
           className="text-xs bg-slate-700 px-2 py-1 rounded border border-slate-600 hover:bg-slate-600 text-slate-200 flex items-center gap-1 transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-400"/> : <Copy size={12} />} 
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed bg-[#1e1e1e] text-[#d4d4d4]">
        {code.trim()}
      </pre>
    </div>
  );
};

const DeveloperDocs: React.FC = () => {
  const theme = getThemeParams();
  const [activeTab, setActiveTab] = useState<'schema' | 'notify'>('notify');

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-white">
          Документация
        </h1>
        <p className="text-sm text-slate-400">
          Архитектура и настройка серверной части.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('notify')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeTab === 'notify' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
          >
              Уведомления (Bot)
          </button>
          <button 
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeTab === 'schema' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
          >
              База Данных
          </button>
      </div>

      {activeTab === 'notify' ? (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl mb-6">
                <h3 className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                    <Bell size={18} />
                    Инструкция: Подключение Бота
                </h3>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2">
                    <li>Создайте бота в <b>@BotFather</b> и получите токен.</li>
                    <li>В Supabase Dashboard перейдите в <b>Edge Functions</b>.</li>
                    <li>Создайте функцию <code>telegram-bot</code> и добавьте секрет <code>BOT_TOKEN</code>.</li>
                    <li>Скопируйте код функции ниже и задеплойте её.</li>
                    <li>Включите Database Webhooks (SQL ниже).</li>
                </ol>
            </div>

            <CodeBlock 
                title="1. Edge Function Code (Deno/TS)" 
                icon={Code} 
                code={BACKEND_DOCS.edgeFunction} 
                lang="typescript"
            />

            <CodeBlock 
                title="2. SQL Triggers (Enable Webhook)" 
                icon={Terminal} 
                code={BACKEND_DOCS.webhookSql} 
                lang="sql"
            />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="mb-8 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="text-purple-400" size={20} />
                    <h3 className="font-bold text-purple-400">Схема Оплаты (P2P)</h3>
                </div>
                <p className="text-xs text-slate-300 mb-2">
                    Мы отказались от Telegram Stars в пользу прямых переводов на карту.
                </p>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2">
                    <li>Пользователь создает заказ с платными опциями.</li>
                    <li>Заказ сохраняется в БД со статусом <code>PENDING</code>.</li>
                    <li>Пользователю показывается окно с номером карты.</li>
                    <li>Пользователь переводит деньги и нажимает "Отправить чек".</li>
                    <li>Открывается чат с Админом с предзаполненным текстом.</li>
                    <li>Админ проверяет поступление и меняет статус на <code>OPEN</code>.</li>
                </ol>
            </div>

            <CodeBlock 
                title="Схема PostgreSQL" 
                icon={Database}
                code={BACKEND_DOCS.dbSchema} 
            />
        </div>
      )}
    </div>
  );
};

export default DeveloperDocs;