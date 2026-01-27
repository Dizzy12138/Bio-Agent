import React, { useState, useEffect } from 'react';
import { useKnowledgeStore } from './stores/knowledgeStore';
import { CategoryTree } from './components/CategoryTree';
import { DocumentLibrary } from './components/DocumentLibrary';
import { MaterialDatabase } from './components/MaterialDatabase';
import { PromptTemplates } from './components/PromptTemplates';
import { DetailPanel } from './components/DetailPanel';
import { APIConfigModal } from './components/APIConfigModal';
import type { KnowledgeViewType, Document, Material, PromptTemplate, SyncStatus } from './types';
import {
    Grid,
    List,
    RotateCw,
    Plus,
    Upload,
    Search,
    Database,
    FileText,
    LayoutTemplate,
    X,
    Settings
} from 'lucide-react';
import { Button } from '../../components/common';

// 获取视图图标
const getViewIcon = (view: KnowledgeViewType) => {
    switch (view) {
        case 'documents': return <FileText size={20} />;
        case 'materials': return <Database size={20} />;
        case 'templates': return <LayoutTemplate size={20} />;
        default: return <FileText size={20} />;
    }
};

// 获取视图标题
const getViewTitle = (view: KnowledgeViewType) => {
    switch (view) {
        case 'documents': return '文献资料库';
        case 'materials': return '生物材料库';
        case 'templates': return '模板管理';
        default: return '未知视图';
    }
};

export const KnowledgeManager: React.FC = () => {
    const {
        viewMode,
        setViewMode,
        categories,
        fetchCategories,
        fetchDocuments,
        apiConfig,
        setAPIConfig,
        checkAPIConnection,
        // isConnected 在库中定义但未在此组件中使用
    } = useKnowledgeStore();

    // 状态管理
    const [activeView, setActiveView] = useState<KnowledgeViewType>('documents');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<Document | Material | PromptTemplate | null>(null);
    const [isAPIConfigOpen, setIsAPIConfigOpen] = useState(false);

    // API 配置持久化
    const storeSetAPIConfig = useKnowledgeStore(state => state.setAPIConfig);

    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        lastSyncAt: null,
        isSyncing: false,
        syncProgress: 0
    });

    useEffect(() => {
        if (activeView === 'documents' && selectedCategory) {
            fetchDocuments(selectedCategory);
        }
        fetchCategories();
        checkAPIConnection();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchDocuments 依赖于 selectedCategory，已在数组中
    }, [activeView, selectedCategory, fetchCategories, checkAPIConnection]);

    const handleSync = async () => {
        setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));

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
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* 左侧侧边栏 - 分类树 */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                {/* 视图切换器 */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['documents', 'materials', 'templates'] as const).map(view => (
                            <button
                                key={view}
                                className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all ${activeView === view
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                onClick={() => setActiveView(view)}
                                title={getViewTitle(view)}
                            >
                                {getViewIcon(view)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    {categories && (
                        <CategoryTree
                            categories={categories}
                            selectedId={selectedCategory}
                            onSelect={(id) => {
                                console.log("Selected node id:", id);
                                setSelectedCategory(id);
                                if (id) {
                                    fetchDocuments(id);
                                }
                            }}
                        />
                    )}
                </div>

                {/* 底部 API 配置入口 */}
                <div className="p-4 border-t border-gray-200">
                    <Button
                        variant="secondary"
                        fullWidth={true}
                        onClick={() => setIsAPIConfigOpen(true)}
                        className="text-xs"
                        leftIcon={<Settings size={14} />}
                    >
                        知识库连接配置
                    </Button>
                </div>
            </aside>

            {/* 主内容区域 */}
            <main className="flex-1 flex flex-col p-6 min-w-0 overflow-hidden">
                <header className="mb-6 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                {getViewIcon(activeView)}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{getViewTitle(activeView)}</h1>
                                <p className="text-sm text-gray-500">
                                    {activeView === 'documents' && '管理和检索您的文献资料'}
                                    {activeView === 'materials' && '查看结构化生物材料特性'}
                                    {activeView === 'templates' && '管理抽取和分析模版'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* 同步状态 */}
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
                                <RotateCw
                                    size={14}
                                    className={`${syncStatus.isSyncing ? 'animate-spin text-blue-500' : 'text-gray-400'}`}
                                />
                                <span>
                                    {syncStatus.isSyncing
                                        ? `同步中 ${syncStatus.syncProgress}%`
                                        : formatSyncTime(syncStatus.lastSyncAt)
                                    }
                                </span>
                                {!syncStatus.isSyncing && (
                                    <button
                                        onClick={handleSync}
                                        className="hover:text-blue-600 transition-colors"
                                        title="立即同步"
                                    >
                                        <RotateCw size={14} />
                                    </button>
                                )}
                            </div>

                            {/* 视图切换 */}
                            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                                <button
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-700'}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-700'}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    <List size={16} />
                                </button>
                            </div>

                            {/* 操作按钮 */}
                            {activeView === 'documents' && (
                                <Button leftIcon={<Upload size={16} />}>
                                    上传文献
                                </Button>
                            )}
                            {activeView === 'templates' && (
                                <Button leftIcon={<Plus size={16} />}>
                                    新建模板
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 搜索和筛选 */}
                    <div className="flex flex-col gap-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white transition-all shadow-sm text-sm"
                                placeholder={`搜索${getViewTitle(activeView)}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {selectedCategory && (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100 animate-in fade-in zoom-in duration-200">
                                    分类: {categories
                                        .flatMap((c: { children?: Array<{ id: string; name: string }> }) => c.children || [])
                                        .find((c: { id: string; name: string }) => c.id === selectedCategory)?.name || selectedCategory}
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className="hover:bg-blue-200 rounded-full p-0.5 ml-1 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm relative">
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
                    setAPIConfig(config);
                    storeSetAPIConfig(config);
                }}
                currentConfig={apiConfig || undefined}
            />
        </div>
    );
};
