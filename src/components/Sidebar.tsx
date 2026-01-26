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
    Search,
    BookOpen,
    Atom,
    Bug,
    Zap // New Icon for Skills
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import './Sidebar.css';

// 定义视图类型
export type ViewType =
    | 'experts'
    | 'chat'
    | 'knowledge'
    | 'bioextract'
    | 'playground'
    | 'settings'
    | 'skills' // Added
    | 'query'
    | 'literature'
    | 'molecular'
    | 'microbial';



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
            { id: 'chat', icon: <MessageSquare size={20} />, label: 'Agent 对话' },
            { id: 'bioextract', icon: <Dna size={20} />, label: 'BioExtract-AI', badge: 'NEW' },
            { id: 'playground', icon: <FileSearch size={20} />, label: '抽取演练场' },
        ]
    },
    {
        title: '数据分析',
        items: [
            { id: 'query', icon: <Search size={20} />, label: '交互式查询' },
            { id: 'literature', icon: <BookOpen size={20} />, label: '文献挖掘' },
            { id: 'molecular', icon: <Atom size={20} />, label: '分子性质' },
            { id: 'microbial', icon: <Bug size={20} />, label: '微生物性状' },
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

// ... imports
import { useNavigate, useLocation } from 'react-router-dom';

// ... (interface definitions kept similar but simplified)

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
