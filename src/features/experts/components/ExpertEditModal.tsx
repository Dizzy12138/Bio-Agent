// ExpertEditModal.tsx - Refactored for Design System V2
import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, TextArea } from '../../../components/common';
import type { Expert } from '../types';
import { EXPERT_DOMAINS, EXPERT_CAPABILITIES } from '../types';
import {
    Info, Star, Wrench, Database, MessageSquare,
    Stethoscope, Microscope, FileText, FlaskConical,
    Check, Sparkles, AlertCircle
} from 'lucide-react';

interface ExpertEditModalProps {
    expert: Expert;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedExpert: Expert) => void;
}

// 可用的知识库 (Mock Data)
const AVAILABLE_KNOWLEDGE_BASES = [
    { id: 'kb-wound-care', name: '创面护理知识库', icon: <Stethoscope size={18} />, docCount: 256, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'kb-biomaterials', name: '生物材料数据库', icon: <FlaskConical size={18} />, docCount: 1024, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'kb-literature', name: '学术文献库', icon: <FileText size={18} />, docCount: 5000, color: 'text-slate-600 bg-slate-50 border-slate-200' },
    { id: 'kb-protocols', name: '实验方案库', icon: <Microscope size={18} />, docCount: 128, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

// 可用的工具
const AVAILABLE_TOOLS = [
    { id: 'knowledge-search', name: '知识库检索', icon: <Database size={16} />, description: '从关联知识库中检索相关信息' },
    { id: 'literature-search', name: '文献检索', icon: <FileText size={16} />, description: '检索PubMed、Web of Science等数据库' },
    { id: 'data-analysis', name: '数据分析', icon: <FlaskConical size={16} />, description: '分析实验数据，生成统计报告' },
];

// Common Avatars
const AVATAR_OPTIONS = ['🧑‍⚕️', '👨‍🔬', '👩‍🔬', '🤖', '🧬', '🔬', '📊', '📚', '🩹'];

const TABS = [
    { id: 'basic', label: '基本信息', icon: <Info size={16} /> },
    { id: 'capabilities', label: '能力标签', icon: <Star size={16} /> },
    { id: 'tools', label: '工具配置', icon: <Wrench size={16} /> },
    { id: 'knowledge', label: '知识库', icon: <Database size={16} /> },
    { id: 'prompt', label: '提示词', icon: <MessageSquare size={16} /> },
] as const;

export const ExpertEditModal: React.FC<ExpertEditModalProps> = ({
    expert,
    isOpen,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState<Expert>(expert);
    const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('basic');
    const [isSaving, setIsSaving] = useState(false);

    // 当 modal 打开时同步表单数据
    // 使用 eslint-disable 因为这是一个合理的模式：在 modal 打开时重置表单
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 在 modal 打开时需要同步外部 prop 到内部 state
        if (isOpen) setFormData(expert);
    }, [expert, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate async save
        await new Promise(resolve => setTimeout(resolve, 600));
        onSave({ ...formData, updatedAt: new Date().toISOString() });
        setIsSaving(false);
    };

    const toggleArrayItem = (field: keyof Expert, value: string) => {
        setFormData(prev => {
            const currentArray = prev[field] as string[];
            const exists = currentArray.includes(value);
            return {
                ...prev,
                [field]: exists
                    ? currentArray.filter(item => item !== value)
                    : [...currentArray, value]
            };
        });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <section className="space-y-4">
                            <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2">基本资料</h4>

                            <div className="grid grid-cols-[80px_1fr] gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-text-secondary">头像</label>
                                    <div className="text-4xl w-20 h-20 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                                        {formData.avatar}
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {AVATAR_OPTIONS.slice(0, 8).map(avatar => (
                                            <button
                                                key={avatar}
                                                onClick={() => setFormData(p => ({ ...p, avatar }))}
                                                className={`w-5 h-5 flex items-center justify-center text-xs rounded hover:bg-slate-100 ${formData.avatar === avatar ? 'bg-primary-100 ring-1 ring-primary-500' : ''}`}
                                            >
                                                {avatar}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        label="专家名称"
                                        value={formData.name}
                                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="例如：生物材料分析专家"
                                    />
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-text-primary">专业领域</label>
                                        <div className="flex flex-wrap gap-2">
                                            {EXPERT_DOMAINS.map(domain => (
                                                <button
                                                    key={domain.id}
                                                    onClick={() => setFormData(p => ({ ...p, domain: domain.name }))}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${formData.domain === domain.name
                                                        ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-primary-200 hover:text-primary-600'
                                                        }`}
                                                >
                                                    {domain.icon} {domain.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <TextArea
                                label="专家简介"
                                value={formData.description}
                                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder="简要描述该专家的主要职责和能力..."
                                rows={3}
                            />
                        </section>
                    </div>
                );

            case 'capabilities':
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-primary-50/50 p-4 rounded-lg border border-primary-100 text-sm text-primary-700 flex gap-3">
                            <Sparkles className="shrink-0 mt-0.5" size={16} />
                            <p className="m-0 text-primary-800">选择该专家具备的核心能力标签，系统将根据标签进行任务路由匹配。</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {EXPERT_CAPABILITIES.map(cap => {
                                const isSelected = formData.capabilities.includes(cap);
                                return (
                                    <button
                                        key={cap}
                                        onClick={() => toggleArrayItem('capabilities', cap)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSelected
                                            ? 'bg-primary-50 border-primary-200 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-300'
                                            }`}>
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <span className={`text-sm font-medium ${isSelected ? 'text-primary-900' : 'text-slate-700'}`}>{cap}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'knowledge':
                return (
                    <div className="space-y-4 animate-fadeIn">
                        {AVAILABLE_KNOWLEDGE_BASES.map(kb => {
                            const isSelected = formData.knowledgeBases.includes(kb.id);
                            return (
                                <div
                                    key={kb.id}
                                    onClick={() => toggleArrayItem('knowledgeBases', kb.id)}
                                    className={`group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                                        ? 'bg-white border-primary-200 ring-1 ring-primary-100 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`p-3 rounded-lg ${kb.color} bg-opacity-10 border border-opacity-20`}>
                                        {kb.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-text-primary flex items-center gap-2">
                                            {kb.name}
                                            {isSelected && <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold">CONNECTED</span>}
                                        </div>
                                        <div className="text-xs text-text-secondary mt-1">{kb.docCount.toLocaleString()} 篇文档索引</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'tools':
                return (
                    <div className="space-y-3 animate-fadeIn">
                        {AVAILABLE_TOOLS.map(tool => {
                            const isSelected = formData.tools.includes(tool.id);
                            return (
                                <div
                                    key={tool.id}
                                    onClick={() => toggleArrayItem('tools', tool.id)}
                                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                                        ? 'bg-slate-800 border-slate-900 text-white shadow-md'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`mt-1 ${isSelected ? 'text-primary-400' : 'text-slate-500'}`}>{tool.icon}</div>
                                    <div>
                                        <div className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{tool.name}</div>
                                        <div className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{tool.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'prompt':
                return (
                    <div className="h-full flex flex-col animate-fadeIn">
                        <TextArea
                            label="System Prompt"
                            value={formData.systemPrompt}
                            onChange={(e) => setFormData(p => ({ ...p, systemPrompt: e.target.value }))}
                            className="flex-1"
                            style={{ minHeight: '300px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                            placeholder="You are an expert in..."
                        />
                        <div className="mt-4 flex gap-2 items-start p-3 bg-blue-50 text-blue-800 rounded-md text-xs">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <p className="m-0">提示词决定了 Agent 的行为模式。建议包含：角色定义、核心任务、回答风格限制。</p>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{formData.avatar}</span>
                    <div className="flex flex-col">
                        <span className="font-semibold text-text-primary leading-tight">编辑专家</span>
                        <span className="text-xs text-text-secondary font-normal">{formData.id}</span>
                    </div>
                </div>
            }
            size="2xl"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>取消</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>保存更改</Button>
                </>
            }
        >
            <div className="flex h-[500px]">
                {/* Sidebar Nav */}
                <nav className="w-48 flex-shrink-0 border-r border-border-subtle pr-4 py-2 space-y-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-slate-100 text-slate-900'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <span className={activeTab === tab.id ? 'text-primary-600' : 'text-slate-400'}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Main Content */}
                <div className="flex-1 pl-6 py-2 overflow-y-auto scrollbar-thin">
                    {renderTabContent()}
                </div>
            </div>
        </Modal>
    );
};
