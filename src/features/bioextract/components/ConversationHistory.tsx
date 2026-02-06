/**
 * BioExtract 对话历史列表组件
 */

import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Clock, Search } from 'lucide-react';
import { chatAPI } from '../../../utils/api';
import './ConversationHistory.css';

interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    expert_name?: string;
}

interface ConversationHistoryProps {
    currentConversationId?: string;
    onSelectConversation: (conversationId: string) => void;
    onNewConversation: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
    currentConversationId,
    onSelectConversation,
    onNewConversation
}) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        setLoading(true);
        try {
            // 使用正确的 API 调用方式
            const response = await chatAPI.getConversations({
                limit: 50,
                skip: 0,
                include_archived: false
            });
            
            console.log('加载对话列表:', response.data);
            
            // 过滤出 BioExtract-AI 的对话
            const bioextractConversations = (response.data || []).filter(
                (conv: Conversation) => conv.expert_name === 'BioExtract-AI'
            );
            
            setConversations(bioextractConversations);
        } catch (error) {
            console.error('加载对话历史失败:', error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('确定删除此对话吗？')) return;

        try {
            await chatAPI.deleteConversation(conversationId);
            setConversations(prev => prev.filter(c => c.id !== conversationId));
            if (conversationId === currentConversationId) {
                onNewConversation();
            }
        } catch (error) {
            console.error('删除对话失败:', error);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return '昨天';
        } else if (days < 7) {
            return `${days}天前`;
        } else {
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        }
    };

    return (
        <div className="conversation-history">
            {/* 头部 */}
            <div className="conversation-history__header">
                <h3 className="conversation-history__title">
                    <MessageSquare size={16} />
                    对话历史
                </h3>
                <button
                    className="conversation-history__new-btn"
                    onClick={onNewConversation}
                    title="新建对话"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* 搜索框 */}
            <div className="conversation-history__search">
                <Search size={14} />
                <input
                    type="text"
                    placeholder="搜索对话..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* 对话列表 */}
            <div className="conversation-history__list">
                {loading ? (
                    <div className="conversation-history__loading">
                        <div className="spinner"></div>
                        <span>加载中...</span>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="conversation-history__empty">
                        <MessageSquare size={32} />
                        <p>暂无对话记录</p>
                        <button onClick={onNewConversation} className="conversation-history__empty-btn">
                            开始新对话
                        </button>
                    </div>
                ) : (
                    filteredConversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`conversation-history__item ${conv.id === currentConversationId ? 'active' : ''}`}
                            onClick={() => onSelectConversation(conv.id)}
                        >
                            <div className="conversation-history__item-content">
                                <div className="conversation-history__item-title">
                                    {conv.title}
                                </div>
                                <div className="conversation-history__item-meta">
                                    <Clock size={10} />
                                    <span>{formatTime(conv.updated_at)}</span>
                                    <span className="conversation-history__item-count">
                                        {conv.message_count} 条消息
                                    </span>
                                </div>
                            </div>
                            <button
                                className="conversation-history__item-delete"
                                onClick={(e) => handleDelete(conv.id, e)}
                                title="删除对话"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
