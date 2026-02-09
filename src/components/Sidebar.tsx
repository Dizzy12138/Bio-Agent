import React, { useState } from 'react';
import {
    Users,
    MessageSquare,
    Database,
    Settings,
    ChevronLeft,
    ChevronRight,
    Dna,
    FileSearch,
    Zap,
    Network
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { UserProfile } from './UserProfile';
import './Sidebar.css';

// 定义视图类型
export type ViewType =
    | 'experts'
    | 'chat'
    | 'knowledge'
    | 'bioextract'
    | 'playground'
    | 'settings'
    | 'skills'
    | 'query'
    | 'literature'
    | 'molecular'
    | 'microbial'
    | 'knowledge-graph';

// 菜单项分组配置
interface MenuItem {
    id: ViewType;
    icon: React.ReactNode;
    label: string;
    badge?: string;
}

interface MenuGroup {
    title: string;
    items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
    {
        title: 'AI 助手',
        items: [
            // Agent 对话菜单已隐藏
            // { id: 'chat', icon: <MessageSquare size={20} />, label: 'Agent 对话' },
            { id: 'bioextract', icon: <Dna size={20} />, label: 'BioExtract-AI', badge: 'NEW' },
            { id: 'playground', icon: <FileSearch size={20} />, label: '抽取演练场' },
        ]
    },
    {
        title: '数据分析',
        items: [
            { id: 'knowledge-graph', icon: <Network size={20} />, label: '知识图谱' },
        ]
    },
    {
        title: '系统管理',
        items: [
            { id: 'experts', icon: <Users size={20} />, label: '专家管理' },
            { id: 'skills', icon: <Zap size={20} />, label: '技能中心' },
            { id: 'knowledge', icon: <Database size={20} />, label: '知识库' },
            { id: 'settings', icon: <Settings size={20} />, label: '系统设置' },
        ]
    }
];

export const Sidebar: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Helper to determine active view based on path
    const getActiveView = (path: string): ViewType => {
        if (path === '/' || path === '/experts') return 'experts';
        if (path.startsWith('/chat')) return 'chat';
        if (path.startsWith('/bioextract')) return 'bioextract';
        if (path.startsWith('/playground')) return 'playground';
        if (path.startsWith('/query')) return 'query';
        if (path.startsWith('/literature')) return 'literature';
        if (path.startsWith('/molecular')) return 'molecular';
        if (path.startsWith('/microbial')) return 'microbial';
        if (path.startsWith('/knowledge-graph')) return 'knowledge-graph';
        if (path.startsWith('/knowledge')) return 'knowledge';
        if (path.startsWith('/settings')) return 'settings';
        if (path.startsWith('/skills')) return 'skills';
        return 'experts';
    };

    const activeView = getActiveView(location.pathname);

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            {/* Logo 区域 */}
            <header className="sidebar__header">
                <div className="sidebar__logo">
                    <img src={logoImg} alt="Livemat Logo" className="sidebar__logo-img" />
                    {!collapsed && (
                        <div className="sidebar__logo-text">
                            <span className="sidebar__logo-title">Livemat</span>
                            <span className="sidebar__logo-subtitle">材料合成生物学</span>
                        </div>
                    )}
                </div>
            </header>

            {/* 导航区域 */}
            <nav className="sidebar__nav">
                {menuGroups.map((group, groupIndex) => (
                    <div key={group.title} className="sidebar__group">
                        {!collapsed && (
                            <div className="sidebar__group-title">{group.title}</div>
                        )}
                        {collapsed && groupIndex > 0 && (
                            <div className="sidebar__group-divider" />
                        )}
                        <div className="sidebar__group-items">
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    className={`sidebar__nav-item ${activeView === item.id ? 'sidebar__nav-item--active' : ''}`}
                                    onClick={() => navigate(item.id === 'experts' ? '/experts' : `/${item.id}`)}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <span className="sidebar__nav-icon">{item.icon}</span>
                                    {!collapsed && (
                                        <>
                                            <span className="sidebar__nav-label">{item.label}</span>
                                            {item.badge && (
                                                <span className="sidebar__nav-badge">{item.badge}</span>
                                            )}
                                        </>
                                    )}
                                    {collapsed && item.badge && (
                                        <span className="sidebar__nav-badge-dot" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* 用户信息 */}
            <UserProfile />

            {/* 底部折叠按钮 */}
            <footer className="sidebar__footer">
                <button
                    className="sidebar__collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? '展开侧边栏' : '收起侧边栏'}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span>收起</span>}
                </button>
            </footer>
        </aside>
    );
};
