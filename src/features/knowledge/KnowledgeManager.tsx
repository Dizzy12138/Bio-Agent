import React, { useState, useEffect, useMemo } from 'react';
import { useKnowledgeStore } from './stores/knowledgeStore';
import { CategoryTree } from './components/CategoryTree';
import { DocumentLibrary } from './components/DocumentLibrary';
import { MaterialDatabase } from './components/MaterialDatabase';
import { PromptTemplates } from './components/PromptTemplates';
import { DetailPanel } from './components/DetailPanel';
import { APIConfigModal } from './components/APIConfigModal';
import type { KnowledgeViewType, CategoryNode, Document, Material, PromptTemplate, SyncStatus } from './types';
import type { KnowledgeAPIConfig } from './api/knowledgeAPI';
import './KnowledgeManager.css';

// Mock 分类数据
// 移除静态 Mock 数据，改为从 Store 获取动态数据

// Icons
const Icons = {
    Grid: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    List: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
    ),
    Search: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    Sync: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </svg>
    ),
    Plus: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Upload: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17,8 12,3 7,8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    ),
    Documents: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    Materials: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
    ),
    Templates: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <path d="M10 12l2 2 4-4" />
        </svg>
    ),
};

// 获取视图图标
const getViewIcon = (view: KnowledgeViewType) => {
    switch (view) {
        case 'documents': return <Icons.Documents />;
        case 'materials': return <Icons.Materials />;
        case 'templates': return <Icons.Templates />;
        default: return <Icons.Documents />;
    }
};

// 获取视图标题
const getViewTitle = (view: KnowledgeViewType) => {
    switch (view) {
        case 'documents': return '文献库';
        case 'materials': return '材料数据库';
        case 'templates': return 'Prompt模板';
        default: return '知识库';
    }
};

export const KnowledgeManager: React.FC = () => {
    const {
        knowledgeBases,
        loadKnowledgeBases,
        isConnected,
        setAPIConfig: storeSetAPIConfig
    } = useKnowledgeStore();

    const [activeView, setActiveView] = useState<KnowledgeViewType>('documents');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<Document | Material | PromptTemplate | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    // SyncStatus 暂时保留本地模拟，因为 API 尚未返回实时同步状态
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        lastSyncAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isSyncing: false,
        syncProgress: 100,
        syncError: null,
        pendingCount: 0,
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isAPIConfigOpen, setIsAPIConfigOpen] = useState(false);
    // Modal 表单状态
    const [apiConfig, setApiConfig] = useState<KnowledgeAPIConfig | null>(null);

    // 加载知识库列表
    useEffect(() => {
        loadKnowledgeBases();
    }, [loadKnowledgeBases]);

    // 转换 KnowledgeBases 为 CategoryTree 结构
    const categories = useMemo(() => {
        const literatureKBs = knowledgeBases.filter(kb => kb.type === 'literature');
        const databaseKBs = knowledgeBases.filter(kb => kb.type === 'database');
        const documentKBs = knowledgeBases.filter(kb => kb.type === 'document');

        return [
            {
                id: 'documents',
                name: '文献库',
                icon: '📚',
                type: 'folder' as const,
                children: [...literatureKBs, ...documentKBs].map(kb => ({
                    id: kb.id,
                    name: kb.name,
                    icon: kb.icon || '📄',
                    type: 'category' as const,
                    count: kb.documentCount
                }))
            },
            {
                id: 'materials',
                name: '材料数据库',
                icon: '🔬',
                type: 'folder' as const,
                children: databaseKBs.map(kb => ({
                    id: kb.id,
                    name: kb.name,
                    icon: kb.icon || '🧬',
                    type: 'category' as const,
                    count: kb.documentCount
                }))
            },
            {
                id: 'templates',
                name: 'Prompt模板',
                icon: '📝',
                type: 'folder' as const,
                children: [
                    { id: 'tpl-analysis', name: '分析类', icon: '📊', type: 'category' as const, count: 8 },
                    { id: 'tpl-synthesis', name: '合成类', icon: '🔄', type: 'category' as const, count: 10 },
                    { id: 'tpl-query', name: '查询类', icon: '🔍', type: 'category' as const, count: 6 },
                ]
            }
        ];
    }, [knowledgeBases]);

    // 处理分类选择
    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setSelectedItem(null);

        // 根据分类自动切换视图
        if (categoryId.startsWith('doc-') || categoryId === 'documents') {
            setActiveView('documents');
        } else if (categoryId.startsWith('mat-') || categoryId === 'materials') {
            setActiveView('materials');
        } else if (categoryId.startsWith('tpl-') || categoryId === 'templates') {
            setActiveView('templates');
        }
    };

    // 处理同步
    const handleSync = async () => {
        setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));

        // 模拟同步过程
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            setSyncStatus(prev => ({ ...prev, syncProgress: i }));
        }

        setSyncStatus(prev => ({
            ...prev,
            isSyncing: false,
            syncProgress: 100,
            lastSyncAt: new Date().toISOString(),
        }));
    };

    // 格式化同步时间
    const formatSyncTime = (isoString: string | null) => {
        if (!isoString) return '从未同步';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return '刚刚';
        if (diffMin < 60) return `${diffMin}分钟前`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}小时前`;
        return date.toLocaleDateString();
    };

    // 渲染内容区域
    const renderContent = () => {
        switch (activeView) {
            case 'documents':
                return (
                    <DocumentLibrary
                        categoryId={selectedCategory}
                        searchQuery={searchQuery}
                        viewMode={viewMode}
                        onItemSelect={setSelectedItem}
                        selectedItemId={selectedItem?.id}
                    />
                );
            case 'materials':
                return (
                    <MaterialDatabase
                        categoryId={selectedCategory}
                        searchQuery={searchQuery}
                        viewMode={viewMode}
                        onItemSelect={setSelectedItem}
                        selectedItemId={selectedItem?.id}
                    />
                );
            case 'templates':
                return (
                    <PromptTemplates
                        categoryId={selectedCategory}
                        searchQuery={searchQuery}
                        viewMode={viewMode}
                        onItemSelect={setSelectedItem}
                        selectedItemId={selectedItem?.id}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="knowledge-manager">
            {/* 左侧分类树 */}
            <aside className={`knowledge-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    {!sidebarCollapsed && (
                        <h2 className="sidebar-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            知识库
                        </h2>
                    )}
                    <button
                        className="collapse-btn"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? '展开' : '收起'}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            {sidebarCollapsed ? (
                                <polyline points="9,18 15,12 9,6" />
                            ) : (
                                <polyline points="15,18 9,12 15,6" />
                            )}
                        </svg>
                    </button>
                </div>

                {!sidebarCollapsed && (
                    <>
                        <div className="sidebar-search">
                            <input
                                type="text"
                                className="sidebar-search-input"
                                placeholder="搜索分类..."
                            />
                        </div>
                        <CategoryTree
                            categories={categories}
                            selectedId={selectedCategory}
                            onSelect={handleCategorySelect}
                        />
                    </>
                )}
            </aside>

            {/* 主内容区域 */}
            <main className="knowledge-content">
                <header className="content-header">
                    <div className="content-header-top">
                        <h1 className="content-title">
                            <span className="content-title-icon">
                                {getViewIcon(activeView)}
                            </span>
                            {getViewTitle(activeView)}
                        </h1>

                        <div className="content-actions">
                            {/* API 连接状态 */}
                            <div className={`api-connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                <span className="status-dot" />
                                {isConnected ? '已连接外部API' : '本地模式'}
                            </div>

                            {/* API 配置按钮 */}
                            <button
                                className="btn btn-outline api-config-btn"
                                onClick={() => setIsAPIConfigOpen(true)}
                                title="配置外部 API"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                                </svg>
                                API 设置
                            </button>

                            {/* 同步状态 */}
                            <div className={`sync-status ${syncStatus.isSyncing ? 'syncing' : ''}`}>
                                <span className={`sync-icon ${syncStatus.isSyncing ? 'spinning' : ''}`}>
                                    <Icons.Sync />
                                </span>
                                <span>
                                    {syncStatus.isSyncing
                                        ? `同步中 ${syncStatus.syncProgress}%`
                                        : formatSyncTime(syncStatus.lastSyncAt)
                                    }
                                </span>
                                {!syncStatus.isSyncing && (
                                    <button
                                        onClick={handleSync}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'inherit',
                                            cursor: 'pointer',
                                            padding: '2px',
                                            display: 'flex',
                                        }}
                                        title="立即同步"
                                    >
                                        <Icons.Sync />
                                    </button>
                                )}
                            </div>

                            {/* 视图切换 */}
                            <div className="view-toggle">
                                <button
                                    className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Icons.Grid />
                                </button>
                                <button
                                    className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    <Icons.List />
                                </button>
                            </div>

                            {/* 操作按钮 */}
                            {activeView === 'documents' && (
                                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icons.Upload />
                                    上传文献
                                </button>
                            )}
                            {activeView === 'templates' && (
                                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icons.Plus />
                                    新建模板
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 搜索和筛选 */}
                    <div className="filter-bar">
                        <div className="search-box">
                            <span className="search-box-icon">
                                <Icons.Search />
                            </span>
                            <input
                                type="text"
                                className="search-box-input"
                                placeholder={`搜索${getViewTitle(activeView)}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {selectedCategory && (
                            <div className="filter-chips">
                                <span className="filter-chip">
                                    分类: {mockCategories
                                        .flatMap(c => c.children || [])
                                        .find(c => c.id === selectedCategory)?.name || selectedCategory}
                                    <span
                                        className="filter-chip-remove"
                                        onClick={() => setSelectedCategory(null)}
                                    >
                                        ×
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="content-body">
                    {renderContent()}
                </div>
            </main>

            {/* 右侧详情面板 */}
            <DetailPanel
                item={selectedItem}
                type={activeView}
                onClose={() => setSelectedItem(null)}
            />

            {/* API 配置模态框 */}
            <APIConfigModal
                isOpen={isAPIConfigOpen}
                onClose={() => setIsAPIConfigOpen(false)}
                onSave={(config) => {
                    setApiConfig(config);
                    storeSetAPIConfig(config);
                }}
                currentConfig={apiConfig || undefined}
            />
        </div>
    );
};
