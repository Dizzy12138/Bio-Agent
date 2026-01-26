import React, { useState } from 'react';
import { ExpertList } from './components/ExpertList';
import { ExpertCreation } from './components/ExpertCreation';
import { ExpertDetail } from './components/ExpertDetail';
import { ExpertEditModal } from './components/ExpertEditModal';
import { TemplateGallery } from './components/TemplateGallery';
import { ExportImportModal } from './components/ExportImportModal';
import type { Expert } from './types';
import { Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mock 专家数据
const mockExperts: Expert[] = [
    {
        id: 'expert-1',
        name: '创面护理专家',
        avatar: '🩹',
        description: '专注于慢性创面护理，熟悉各类敷料材料和治疗方案，能够根据创面分期给出专业建议。',
        domain: '创面护理',
        capabilities: ['病例分析', '材料推荐', '治疗建议', '知识问答'],
        systemPrompt: `你是一位资深的创面护理专家，拥有丰富的临床经验。你的职责是：
1. 分析患者创面情况，判断创面分期
2. 推荐合适的敷料材料和治疗方案
3. 提供专业的护理指导
4. 解答创面护理相关问题

请始终基于循证医学原则给出建议，对于复杂病例建议患者咨询专业医生。`,
        tools: ['knowledge-search', 'literature-search'],
        knowledgeBases: ['kb-wound-care', 'kb-biomaterials'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
        createdBy: 'system',
        usageCount: 1256,
        isSystem: true,
        status: 'active',
    },
    {
        id: 'expert-2',
        name: '生物材料分析师',
        avatar: '🧬',
        description: '专业分析生物材料的理化性能和生物相容性，支持材料选型和配方优化。',
        domain: '生物材料',
        capabilities: ['数据分析', '材料推荐', '图表生成', '报告撰写'],
        systemPrompt: `你是一位生物材料分析专家，擅长：
1. 分析材料的理化性质（如力学性能、降解特性）
2. 评估生物相容性和安全性
3. 对比不同材料的优缺点
4. 提供材料选型建议

请使用专业术语，并在需要时提供数据支持。`,
        tools: ['knowledge-search', 'data-analysis', 'chart-generator'],
        knowledgeBases: ['kb-biomaterials'],
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z',
        createdBy: 'system',
        usageCount: 892,
        isSystem: true,
        status: 'active',
    },
    {
        id: 'expert-3',
        name: '文献综述助手',
        avatar: '📚',
        description: '高效检索和分析学术文献，帮助快速了解研究前沿，生成文献综述。',
        domain: '文献分析',
        capabilities: ['文献检索', '数据分析', '总结', '报告撰写'],
        systemPrompt: `你是一位学术文献分析专家，能够：
1. 检索相关领域的学术文献
2. 分析文献的核心观点和方法
3. 总结研究趋势和前沿进展
4. 生成结构化的文献综述

请确保引用准确，标注文献来源。`,
        tools: ['literature-search', 'knowledge-search'],
        knowledgeBases: [],
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-25T00:00:00Z',
        createdBy: 'system',
        usageCount: 2341,
        isSystem: true,
        status: 'active',
    },
];

type ViewMode = 'list' | 'creation' | 'detail';

export const ExpertManager: React.FC = () => {
    const [experts, setExperts] = useState<Expert[]>(mockExperts);
    const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
    const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportingExpert, setExportingExpert] = useState<Expert | null>(null);

    const handleCreateExpert = () => {
        setSelectedExpert(null);
        setViewMode('creation');
    };

    const handleSelectExpert = (expert: Expert) => {
        setSelectedExpert(expert);
        setViewMode('detail');
    };

    const handleExpertCreated = (newExpert: Expert) => {
        setExperts([...experts, newExpert]);
        setSelectedExpert(newExpert);
        setViewMode('detail');
    };

    const handleCancelCreation = () => {
        setViewMode('list');
        setSelectedExpert(null);
    };

    // 从模板创建专家
    const handleCreateFromTemplate = (templateData: Omit<Expert, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
        const newExpert: Expert = {
            ...templateData,
            id: `expert-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'user',
        };
        setExperts([...experts, newExpert]);
        setSelectedExpert(newExpert);
        setViewMode('detail');
    };

    const handleEditExpert = (expert: Expert) => {
        setEditingExpert(expert);
        setIsEditModalOpen(true);
    };

    const handleSaveExpert = (updatedExpert: Expert) => {
        setExperts(experts.map(e => e.id === updatedExpert.id ? updatedExpert : e));
        setSelectedExpert(updatedExpert);
        setIsEditModalOpen(false);
        setEditingExpert(null);
    };

    const handleDeleteExpert = (expertId: string) => {
        if (confirm('确定要删除这个专家吗？此操作无法撤销。')) {
            setExperts(experts.filter(e => e.id !== expertId));
            setSelectedExpert(null);
            setViewMode('list');
        }
    };

    const navigate = useNavigate();

    const handleStartChat = (expert: Expert) => {
        // TODO: Pass expert context to chat
        console.log('Start chat with:', expert.name);
        navigate('/chat');
    };

    const filteredExperts = experts.filter(expert =>
        expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expert.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expert.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const systemExperts = filteredExperts.filter(e => e.isSystem);
    const customExperts = filteredExperts.filter(e => !e.isSystem);

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Left Panel - Expert List */}
            <ExpertList
                systemExperts={systemExperts}
                customExperts={customExperts}
                selectedExpert={selectedExpert}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectExpert={handleSelectExpert}
                onCreateExpert={handleCreateExpert}
                onOpenTemplates={() => setIsTemplateGalleryOpen(true)}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {viewMode === 'creation' ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        <ExpertCreation
                            onComplete={handleExpertCreated}
                            onCancel={handleCancelCreation}
                        />
                    </div>
                ) : viewMode === 'detail' && selectedExpert ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        <ExpertDetail
                            expert={selectedExpert}
                            onEdit={handleEditExpert}
                            onDelete={handleDeleteExpert}
                            onStartChat={handleStartChat}
                            onExport={(expert: Expert) => {
                                setExportingExpert(expert);
                                setIsExportModalOpen(true);
                            }}
                        />
                    </div>
                ) : (
                    <EmptyState onCreateExpert={handleCreateExpert} />
                )}
            </main>

            {/* Edit Modal */}
            {editingExpert && (
                <ExpertEditModal
                    expert={editingExpert}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingExpert(null);
                    }}
                    onSave={handleSaveExpert}
                />
            )}

            {/* Template Gallery */}
            <TemplateGallery
                isOpen={isTemplateGalleryOpen}
                onClose={() => setIsTemplateGalleryOpen(false)}
                onSelectTemplate={handleCreateFromTemplate}
            />

            {/* Export Modal */}
            {exportingExpert && (
                <ExportImportModal
                    isOpen={isExportModalOpen}
                    mode="export"
                    expert={exportingExpert}
                    onClose={() => {
                        setIsExportModalOpen(false);
                        setExportingExpert(null);
                    }}
                />
            )}
        </div>
    );
};

// Empty State Component
const EmptyState: React.FC<{ onCreateExpert: () => void }> = ({ onCreateExpert }) => (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md w-full space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500">
                <Users size={40} />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">选择或创建专家</h3>
                <p className="text-gray-500 leading-relaxed">
                    从左侧选择一位专家查看详情，或者通过对话创建您自己的领域专家。
                    专家将帮助您在特定领域提供专业的分析和建议。
                </p>
            </div>
            <button
                onClick={onCreateExpert}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
                <Plus size={20} />
                创建新专家
            </button>
        </div>
    </div>
);
