import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    MessageSquare,
    Plus,
    Search,
    Pin,
    PinOff,
    Trash2,
    MoreVertical,
    Clock,
    X,
    ChevronRight,
    Download,
    Star,
    Tag
} from 'lucide-react';
import { useChatStore } from '../../../stores';
import type { Conversation } from '../../../types';
import { PRESET_TAGS } from '../../../types';
import './ChatHistory.css';

interface ChatHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectConversation: (conversation: Conversation) => void;
    onNewConversation: () => void;
    onExportConversation?: (conversation: Conversation) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
    isOpen,
    onClose,
    onSelectConversation,
    onNewConversation,
    onExportConversation,
}) => {
    const {
        conversations,
        currentConversation,
        removeConversation,
        pinConversation,
        favoriteConversation,
        addTagToConversation,
        removeTagFromConversation,
    } = useChatStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<'date' | 'expert' | 'favorites'>('date');

    // 过滤对话
    const filteredConversations = useMemo(() => {
        return conversations.filter(conv =>
            conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (conv.expertName?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [conversations, searchQuery]);

    // 按日期分组
    const groupedByDate = useMemo(() => {
        const groups: { [key: string]: Conversation[] } = {
            pinned: [],
            favorites: [],
            today: [],
            yesterday: [],
            thisWeek: [],
            earlier: [],
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        filteredConversations.forEach(conv => {
            if (conv.isPinned) {
                groups.pinned.push(conv);
                return;
            }
            if (conv.isFavorite) {
                groups.favorites.push(conv);
                return;
            }

            const convDate = new Date(conv.updatedAt);
            if (convDate >= today) {
                groups.today.push(conv);
            } else if (convDate >= yesterday) {
                groups.yesterday.push(conv);
            } else if (convDate >= weekAgo) {
                groups.thisWeek.push(conv);
            } else {
                groups.earlier.push(conv);
            }
        });

        return [
            { id: 'pinned', label: '📌 已置顶', conversations: groups.pinned },
            { id: 'favorites', label: '⭐ 收藏', conversations: groups.favorites },
            { id: 'today', label: '今天', conversations: groups.today },
            { id: 'yesterday', label: '昨天', conversations: groups.yesterday },
            { id: 'thisWeek', label: '本周', conversations: groups.thisWeek },
            { id: 'earlier', label: '更早', conversations: groups.earlier },
        ].filter(g => g.conversations.length > 0);
    }, [filteredConversations]);

    // 按专家分组
    const groupedByExpert = useMemo(() => {
        const groups: { [key: string]: { name: string; avatar: string; conversations: Conversation[] } } = {};

        filteredConversations.forEach(conv => {
            const key = conv.expertId || 'general';
            if (!groups[key]) {
                groups[key] = {
                    name: conv.expertName || '通用助手',
                    avatar: conv.expertAvatar || '🤖',
                    conversations: [],
                };
            }
            groups[key].conversations.push(conv);
        });

        return Object.entries(groups).map(([id, data]) => ({
            id,
            label: `${data.avatar} ${data.name}`,
            conversations: data.conversations,
        }));
    }, [filteredConversations]);

    const groups = groupBy === 'date' ? groupedByDate : groupedByExpert;

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 1000))} 分钟前`;
        } else if (diff < 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
        } else {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
    };

    const handleDelete = (e: React.MouseEvent, convId: string) => {
        e.stopPropagation();
        if (confirm('确定要删除这个对话吗？')) {
            removeConversation(convId);
        }
        setActiveMenu(null);
    };

    const handlePin = (e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation();
        pinConversation(conv.id, !conv.isPinned);
        setActiveMenu(null);
    };

    if (!isOpen) return null;

    const panelContent = (
        <div className="chat-history-overlay" onClick={onClose}>
            <aside className="chat-history-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="history-header">
                    <div className="history-title">
                        <Clock size={20} />
                        <span>对话历史</span>
                    </div>
                    <button className="history-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                {/* Search and Actions */}
                <div className="history-actions">
                    <div className="history-search">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="搜索对话..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="new-chat-btn" onClick={onNewConversation}>
                        <Plus size={18} />
                        新对话
                    </button>
                </div>

                {/* Group By Tabs */}
                <div className="history-tabs">
                    <button
                        className={`history-tab ${groupBy === 'date' ? 'active' : ''}`}
                        onClick={() => setGroupBy('date')}
                    >
                        按时间
                    </button>
                    <button
                        className={`history-tab ${groupBy === 'expert' ? 'active' : ''}`}
                        onClick={() => setGroupBy('expert')}
                    >
                        按专家
                    </button>
                </div>

                {/* Conversation List */}
                <div className="history-list">
                    {groups.length === 0 ? (
                        <div className="history-empty">
                            <MessageSquare size={48} strokeWidth={1} />
                            <p>暂无对话记录</p>
                        </div>
                    ) : (
                        groups.map(group => (
                            <div key={group.id} className="history-group">
                                <div className="group-label">{group.label}</div>
                                {group.conversations.map(conv => (
                                    <div
                                        key={conv.id}
                                        className={`conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
                                        onClick={() => onSelectConversation(conv)}
                                    >
                                        <div className="conv-avatar">
                                            {conv.expertAvatar || '💬'}
                                        </div>
                                        <div className="conv-content">
                                            <div className="conv-title">
                                                {conv.isPinned && <Pin size={12} className="pin-icon" />}
                                                {conv.isFavorite && <Star size={12} className="favorite-icon" />}
                                                {conv.title}
                                            </div>
                                            <div className="conv-meta">
                                                <span className="conv-expert">{conv.expertName || '通用'}</span>
                                                <span className="conv-time">{formatTime(conv.updatedAt)}</span>
                                            </div>
                                            {conv.tags && conv.tags.length > 0 && (
                                                <div className="conv-tags">
                                                    {conv.tags.slice(0, 3).map(tagId => {
                                                        const tag = PRESET_TAGS.find(t => t.id === tagId);
                                                        return tag ? (
                                                            <span
                                                                key={tagId}
                                                                className="conv-tag"
                                                                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                                            >
                                                                {tag.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                    {conv.tags.length > 3 && (
                                                        <span className="conv-tag">+{conv.tags.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="conv-actions">
                                            <button
                                                className="conv-menu-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === conv.id ? null : conv.id);
                                                }}
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {activeMenu === conv.id && (
                                                <div className="conv-menu">
                                                    <button onClick={(e) => handlePin(e, conv)}>
                                                        {conv.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                                        {conv.isPinned ? '取消置顶' : '置顶'}
                                                    </button>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        favoriteConversation(conv.id, !conv.isFavorite);
                                                        setActiveMenu(null);
                                                    }}>
                                                        <Star size={14} fill={conv.isFavorite ? 'currentColor' : 'none'} />
                                                        {conv.isFavorite ? '取消收藏' : '收藏'}
                                                    </button>
                                                    <div className="conv-menu-divider" />
                                                    <div className="conv-menu-label">添加标签</div>
                                                    <div className="conv-tag-list">
                                                        {PRESET_TAGS.map(tag => {
                                                            const hasTag = conv.tags?.includes(tag.id);
                                                            return (
                                                                <button
                                                                    key={tag.id}
                                                                    className={`tag-option ${hasTag ? 'active' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (hasTag) {
                                                                            removeTagFromConversation(conv.id, tag.id);
                                                                        } else {
                                                                            addTagToConversation(conv.id, tag.id);
                                                                        }
                                                                    }}
                                                                    style={{ '--tag-color': tag.color } as React.CSSProperties}
                                                                >
                                                                    <Tag size={12} />
                                                                    {tag.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="conv-menu-divider" />
                                                    {onExportConversation && (
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            onExportConversation(conv);
                                                            setActiveMenu(null);
                                                        }}>
                                                            <Download size={14} />
                                                            导出
                                                        </button>
                                                    )}
                                                    <button className="danger" onClick={(e) => handleDelete(e, conv.id)}>
                                                        <Trash2 size={14} />
                                                        删除
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight size={16} className="conv-arrow" />
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </aside>
        </div>
    );

    return createPortal(panelContent, document.body);
};
