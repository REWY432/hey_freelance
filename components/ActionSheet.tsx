import React from 'react';
import BottomSheet from './BottomSheet';
import { triggerHaptic } from '../services/telegram';
import { 
  Share2, Flag, Copy, ExternalLink, Heart, 
  EyeOff, Trash2, Edit, ChevronRight 
} from 'lucide-react';

interface ActionItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  color?: 'default' | 'danger' | 'success';
  onClick: () => void;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionItem[];
  cancelLabel?: string;
}

const ActionSheet: React.FC<ActionSheetProps> = ({ 
  isOpen, 
  onClose, 
  title,
  actions,
  cancelLabel = 'Отмена'
}) => {

  const handleAction = (action: ActionItem) => {
    triggerHaptic('medium');
    action.onClick();
    onClose();
  };

  const getColorClasses = (color: ActionItem['color']) => {
    switch (color) {
      case 'danger':
        return 'text-rose-400 hover:bg-rose-500/10';
      case 'success':
        return 'text-emerald-400 hover:bg-emerald-500/10';
      default:
        return 'text-white hover:bg-slate-700/50';
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showHandle={true}
    >
      <div className="px-2 pb-2">
        {/* Title */}
        {title && (
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-400 text-center">{title}</h3>
          </div>
        )}

        {/* Actions */}
        <div className="py-2">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl
                         transition-colors active:scale-[0.98] ${getColorClasses(action.color)}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                action.color === 'danger' 
                  ? 'bg-rose-500/10' 
                  : action.color === 'success'
                    ? 'bg-emerald-500/10'
                    : 'bg-slate-700/50'
              }`}>
                {action.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{action.label}</div>
                {action.sublabel && (
                  <div className="text-xs text-slate-500 mt-0.5">{action.sublabel}</div>
                )}
              </div>
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div className="px-2 pt-2 border-t border-slate-700/50">
          <button
            onClick={onClose}
            className="w-full py-3.5 text-sm font-medium text-slate-400 
                      hover:text-white transition-colors rounded-xl
                      hover:bg-slate-700/30 active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

// Пример готового ActionSheet для действий с заказом
interface JobActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  isOwner: boolean;
  onShare: () => void;
  onBookmark: () => void;
  onCopyLink: () => void;
  onReport: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onHide?: () => void;
}

export const JobActionsSheet: React.FC<JobActionsSheetProps> = ({
  isOpen,
  onClose,
  isBookmarked,
  isOwner,
  onShare,
  onBookmark,
  onCopyLink,
  onReport,
  onEdit,
  onDelete,
  onHide
}) => {
  const commonActions: ActionItem[] = [
    {
      id: 'share',
      icon: <Share2 size={20} />,
      label: 'Поделиться',
      sublabel: 'Отправить друзьям',
      onClick: onShare
    },
    {
      id: 'copy',
      icon: <Copy size={20} />,
      label: 'Копировать ссылку',
      onClick: onCopyLink
    },
  ];

  const userActions: ActionItem[] = [
    {
      id: 'bookmark',
      icon: <Heart size={20} fill={isBookmarked ? 'currentColor' : 'none'} />,
      label: isBookmarked ? 'Убрать из избранного' : 'В избранное',
      color: isBookmarked ? 'danger' : 'default',
      onClick: onBookmark
    },
    {
      id: 'hide',
      icon: <EyeOff size={20} />,
      label: 'Скрыть заказ',
      sublabel: 'Больше не показывать',
      onClick: onHide || (() => {})
    },
    {
      id: 'report',
      icon: <Flag size={20} />,
      label: 'Пожаловаться',
      color: 'danger',
      onClick: onReport
    },
  ];

  const ownerActions: ActionItem[] = [
    {
      id: 'edit',
      icon: <Edit size={20} />,
      label: 'Редактировать',
      onClick: onEdit || (() => {})
    },
    {
      id: 'delete',
      icon: <Trash2 size={20} />,
      label: 'Удалить заказ',
      color: 'danger',
      onClick: onDelete || (() => {})
    },
  ];

  const actions = [
    ...commonActions,
    ...(isOwner ? ownerActions : userActions)
  ];

  return (
    <ActionSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Действия"
      actions={actions}
    />
  );
};

export default ActionSheet;
