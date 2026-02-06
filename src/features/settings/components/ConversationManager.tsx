/**
 * 对话记录管理组件（完整版）
 * 管理员可以查看所有用户的对话记录
 */

import React, { useState, useEffect } from 'react';
import { Button, useToast } from '../../../components/common';
import { 
    MessageSquare, Search, Filter, Download, Trash2, 
    Star, Archive, Tag, Calendar, User, Eye, X
} from 'lucide-react';
import './ConversationManager.css';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
        model?: string;
        tokens?: number;
        latency?: number;
        cost?: number;
    };
}

interface Conversation {
    id: string;
    user_id: string;
    title: string;
    model?: string;
    expert_name?: string;
    message_count: number;
    is_archived: boolean;
    is_favorite: boolean;
    tags: string[];
    created_at: string;
    updated_at: string;
}

interface ConversationDetail {
    conversation: Conversation;
    messages: Message[];
}

export const ConversationManager: React.FC = () => {
    const { success, error } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUserId, setFilterUserId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetchConversations();
        fetchStats();
    }, [page, filterUserId, startDate, endDate]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/v1/admin/conversations/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error('获取统计失败:', e);
        }
    };

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: '20'
            });
            
            if (filterUserId) params.append('user_id', filterUserId);
            if (searchQuery) params.append('keyword', searchQuery);
            if (startDate) params.append('start_date', new Date(startDate).toISOString());
            if (endDate) params.append('end_date', new Date(endDate).toISOString());

            const res = await fetch(`/api/v1/admin/conversations?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setConversations(data.items);
                setTotal(data.total);
            } else if (res.status === 401) {
                error('认证失败，请重新登录');
            } else if (res.status === 403) {
                error('需要管理员权限');
            } else {
                error('加载失败');
            }
        } catch (e) {
            console.error('获取对话列表失败:', e);
            error('加载失败');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (conversationId: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/v1/admin/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedConversation(data);
                setShowDetailDrawer(true);
            } else {
                error('加载对话详情失败');
            }
        } catch (e) {
            error('加载失败');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除此对话吗？此操作不可恢复。')) return;

        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/v1/admin/conversations/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                success('删除成功');
                fetchConversations();
                fetchStats();
            } else {
                error('删除失败');
            }
        } catch (e) {
            error('删除失败');
        }
    };

    const handleExport = async (conversationId: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/v1/admin/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { 
                    type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `conversation-${conversationId}.json`;
                a.click();
                URL.revokeObjectURL(url);
                success('导出成功');
            }
        } catch (e) {
            error('导出失败');
        }
    };

    return (
        <div className="conversation-manager">
            {/* 统计卡片 */}
            {stats && (
                <div className="stats-cards">
                    <div className="stat-card">
                        <div className="stat-label">总对话数</div>
                        <div className="stat-value">{stats.total_conversations}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">总消息数</div>
                        <div className="stat-value">{stats.total_messages}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">活跃用户</div>
                        <div className="stat-value">{stats.active_users}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">今日新增</div>
                        <div className="stat-value">{stats.today_conversations}</div>
                    </div>
                </div>
            )}

            {/* 筛选工具栏 */}
            <div className="conversation-toolbar">
                <div className="search-filter-group">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="搜索对话标题..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && fetchConversations()}
                        />
                    </div>

                    <div className="filter-box">
                        <User size={18} />
                        <input
                            type="text"
                            placeholder="用户ID筛选"
                            value={filterUserId}
                            onChange={(e) => setFilterUserId(e.target.value)}
                        />
                    </div>

                    <div className="date-filter">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="开始日期"
                        />
                        <span>至</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="结束日期"
                        />
                    </div>

                    <Button onClick={fetchConversations} variant="secondary" size="sm">
                        <Filter size={14} />
                        筛选
                    </Button>
                </div>
            </div>

            {/* 对话列表 */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>加载中...</p>
                </div>
            ) : conversations.length === 0 ? (
                <div className="empty-state">
                    <MessageSquare size={48} />
                    <h3>暂无对话记录</h3>
                    <p>没有找到符合条件的对话</p>
                </div>
            ) : (
                <>
                    <div className="conversations-list">
                        {conversations.map(conv => (
                            <div key={conv.id} className="conversation-item">
                                <div className="conversation-content">
                                    <div className="conversation-header">
                                        <h3>{conv.title}</h3>
                                        <div className="conversation-badges">
                                            {conv.is_favorite && <Star size={14} className="favorite-icon" />}
                                            {conv.is_archived && <Archive size={14} className="archive-icon" />}
                                        </div>
                                    </div>

                                    <div className="conversation-meta">
                                        <span className="meta-item">
                                            <User size={12} />
                                            用户: {conv.user_id}
                                        </span>
                                        {conv.expert_name && (
                                            <span className="meta-item">
                                                专家: {conv.expert_name}
                                            </span>
                                        )}
                                        {conv.model && (
                                            <span className="meta-item">
                                                模型: {conv.model}
                                            </span>
                                        )}
                                        <span className="meta-item">
                                            <MessageSquare size={12} />
                                            {conv.message_count} 条消息
                                        </span>
                                        <span className="meta-item">
                                            <Calendar size={12} />
                                            {new Date(conv.updated_at).toLocaleString()}
                                        </span>
                                    </div>

                                    {conv.tags.length > 0 && (
                                        <div className="conversation-tags">
                                            {conv.tags.map(tag => (
                                                <span key={tag} className="tag">
                                                    <Tag size={10} />
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="conversation-actions">
                                    <button
                                        onClick={() => handleViewDetail(conv.id)}
                                        className="action-btn"
                                        title="查看详情"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleExport(conv.id)}
                                        className="action-btn"
                                        title="导出"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(conv.id)}
                                        className="action-btn danger"
                                        title="删除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 分页 */}
                    <div className="pagination">
                        <Button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            variant="secondary"
                            size="sm"
                        >
                            上一页
                        </Button>
                        <span className="page-info">
                            第 {page} 页 · 共 {total} 条记录
                        </span>
                        <Button
                            onClick={() => setPage(p => p + 1)}
                            disabled={conversations.length < 20}
                            variant="secondary"
                            size="sm"
                        >
                            下一页
                        </Button>
                    </div>
                </>
            )}

            {/* 对话详情抽屉 */}
            {showDetailDrawer && selectedConversation && (
                <div className="detail-drawer-overlay" onClick={() => setShowDetailDrawer(false)}>
                    <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-header">
                            <h2>{selectedConversation.conversation.title}</h2>
                            <button onClick={() => setShowDetailDrawer(false)} className="close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="drawer-meta">
                            <span>用户: {selectedConversation.conversation.user_id}</span>
                            <span>消息数: {selectedConversation.messages.length}</span>
                            <span>创建时间: {new Date(selectedConversation.conversation.created_at).toLocaleString()}</span>
                        </div>

                        <div className="drawer-content">
                            {selectedConversation.messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`message-bubble ${msg.role}`}>
                                    <div className="message-header">
                                        <span className="message-role">
                                            {msg.role === 'user' ? '用户' : msg.role === 'assistant' ? 'AI助手' : '系统'}
                                        </span>
                                        <span className="message-time">
                                            {new Date(msg.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="message-content">
                                        <ReactMarkdown
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                    {msg.metadata && (
                                        <div className="message-metadata">
                                            {msg.metadata.model && <span>模型: {msg.metadata.model}</span>}
                                            {msg.metadata.tokens && <span>Tokens: {msg.metadata.tokens}</span>}
                                            {msg.metadata.latency && <span>延迟: {msg.metadata.latency.toFixed(2)}s</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

