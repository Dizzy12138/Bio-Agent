import React, { useState } from 'react';
import {
    Users,
    MessageSquare,
    Database,
    Settings,
    ChevronLeft,
    ChevronRight,
    FlaskConical,
    Dna
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
    activeView: 'experts' | 'chat' | 'knowledge' | 'bioextract' | 'settings';
    onViewChange: (view: 'experts' | 'chat' | 'knowledge' | 'bioextract' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
    const [collapsed, setCollapsed] = useState(false);

    const menuItems = [
        { id: 'experts' as const, icon: <Users size={20} />, label: '专家管理' },
        { id: 'chat' as const, icon: <MessageSquare size={20} />, label: 'Agent对话' },
        { id: 'bioextract' as const, icon: <Dna size={20} />, label: 'BioExtract-AI' },
        { id: 'knowledge' as const, icon: <Database size={20} />, label: '知识库管理' },
        { id: 'settings' as const, icon: <Settings size={20} />, label: '系统设置' },
    ];

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">
                    <FlaskConical size={28} />
                    {!collapsed && <span>BioMed Agent</span>}
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => onViewChange(item.id)}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button
                    className="collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? '展开' : '收起'}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
    );
};
