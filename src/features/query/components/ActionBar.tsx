import React from 'react';
import {
    Download,
    FileJson,
    FlaskConical,
    GitCompare,
    FolderPlus,
    Loader2
} from 'lucide-react';
import type { BatchAction, TableSelection } from '../types';
import './ActionBar.css';

interface ActionBarProps {
    selection: TableSelection;
    loading?: boolean;
    onAction: (action: BatchAction) => void;
}

/**
 * ActionBar - 批量操作栏
 * 
 * 当有行被选中时显示，提供批量导出、分析、对比等操作
 */
export const ActionBar: React.FC<ActionBarProps> = ({
    selection,
    loading = false,
    onAction
}) => {
    const selectedCount = selection.selectedIds.size;

    if (selectedCount === 0) {
        return null;
    }

    const actions = [
        {
            id: 'export_csv' as BatchAction,
            label: '导出 CSV',
            icon: <Download size={16} />,
            variant: 'secondary' as const
        },
        {
            id: 'export_json' as BatchAction,
            label: '导出 JSON',
            icon: <FileJson size={16} />,
            variant: 'secondary' as const
        },
        {
            id: 'send_to_analysis' as BatchAction,
            label: '发送至分析',
            icon: <FlaskConical size={16} />,
            variant: 'primary' as const
        },
        {
            id: 'compare' as BatchAction,
            label: '对比分析',
            icon: <GitCompare size={16} />,
            variant: 'secondary' as const,
            disabled: selectedCount < 2
        },
        {
            id: 'add_to_collection' as BatchAction,
            label: '添加到集合',
            icon: <FolderPlus size={16} />,
            variant: 'secondary' as const
        }
    ];

    return (
        <div className="action-bar">
            <div className="action-bar__info">
                <span className="action-bar__count">
                    已选中 <strong>{selectedCount}</strong> 项
                </span>
            </div>

            <div className="action-bar__actions">
                {actions.map(action => (
                    <button
                        key={action.id}
                        className={`action-bar__btn action-bar__btn--${action.variant}`}
                        disabled={action.disabled || loading}
                        onClick={() => onAction(action.id)}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : action.icon}
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
