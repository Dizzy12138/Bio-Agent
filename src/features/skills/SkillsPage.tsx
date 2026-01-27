import React, { useState, useEffect } from 'react';
import { useToast, Modal, Button } from '../../components/common';
import { Shield, Zap, Globe, Calculator, Clock, RotateCcw, Plus } from 'lucide-react';

interface SkillConfig {
    id: string;
    name: string;
    description: string;
    type: 'mcp' | 'api' | 'native';
    source: string;
    enabled: boolean;
    executionConfig: {
        requiresApproval: boolean;
    };
}

export const SkillsPage: React.FC = () => {
    const [skills, setSkills] = useState<SkillConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSkillJson, setNewSkillJson] = useState('{\n  "id": "my-skill",\n  "name": "My Skill",\n  "description": "Description...",\n  "type": "api",\n  "source": "Custom",\n  "enabled": true,\n  "executionConfig": { "requiresApproval": false }\n}');
    const { success, error } = useToast();

    useEffect(() => {
        fetchSkills();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 组件初始化时只执行一次
    }, []);

    const fetchSkills = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/config/skills');
            if (res.ok) {
                const data = await res.json();
                setSkills(data);
            }
        } catch (e) {
            console.error(e);
            error('获取技能列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/config/skills/reset', { method: 'POST' });
            if (res.ok) {
                success('已重置默认技能');
                fetchSkills();
            } else {
                error('重置失败');
            }
        } catch {
            error('网络错误');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSkill = async () => {
        try {
            const skill = JSON.parse(newSkillJson);
            const res = await fetch('/api/v1/config/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(skill)
            });

            if (res.ok) {
                setShowAddModal(false);
                success('添加技能成功');
                fetchSkills();
            } else {
                const err = await res.json();
                error(`添加失败: ${err.detail || '未知错误'}`);
            }
        } catch (e) {
            error(`添加失败: ${e instanceof Error ? e.message : 'JSON 格式错误'}`);
        }
    };

    const handleToggle = async (skill: SkillConfig) => {
        try {
            const res = await fetch(`/api/v1/config/skills/${skill.id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !skill.enabled })
            });
            if (res.ok) {
                fetchSkills();
                success(`${skill.name} 已${!skill.enabled ? '启用' : '禁用'}`);
            } else {
                error('操作失败');
            }
        } catch {
            error('网络错误');
        }
    };

    const getIcon = (skill: SkillConfig) => {
        if (skill.name.includes('search')) return <Globe size={20} className="text-blue-500" />;
        if (skill.name.includes('calc')) return <Calculator size={20} className="text-orange-500" />;
        if (skill.name.includes('time')) return <Clock size={20} className="text-green-500" />;
        return <Zap size={20} className="text-gray-500" />;
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="text-yellow-500" />
                        技能中心 (Skills Store)
                    </h1>
                    <p className="text-gray-500 mt-1">管理 Agent 可调用的原子化能力 (MCP Tools / Native Functions)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleReset} leftIcon={<RotateCcw size={16} />} disabled={loading}>
                        重置默认
                    </Button>
                    <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus size={16} />}>
                        添加技能
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map(skill => (
                    <div key={skill.id} className={`border rounded-lg p-5 transition-all ${skill.enabled ? 'bg-white shadow-sm border-blue-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg h-fit">
                                    {getIcon(skill)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{skill.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-2">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded-full border">{skill.type.toUpperCase()}</span>
                                        <span className="truncate max-w-[150px]">{skill.source}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                        {skill.description}
                                    </p>

                                    {/* Execution Policy Banner */}
                                    {skill.executionConfig.requiresApproval && (
                                        <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded w-fit">
                                            <Shield size={12} />
                                            <span>需要人类确认 (Human-in-the-loop)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={skill.enabled}
                                        onChange={() => handleToggle(skill)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {skills.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                    暂无技能。请点击“重置默认”恢复系统技能，或“添加技能”注册新工具。
                </div>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="添加自定义技能"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>取消</Button>
                        <Button onClick={handleAddSkill}>确认添加</Button>
                    </>
                }
            >
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">技能配置 (JSON)</label>
                    <textarea
                        className="w-full h-80 border border-gray-300 rounded-lg p-3 font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none leading-5"
                        value={newSkillJson}
                        onChange={e => setNewSkillJson(e.target.value)}
                        placeholder="Paste SkillConfig JSON here..."
                    />
                    <p className="text-xs text-gray-500 mt-2 bg-blue-50 p-2 rounded text-blue-700 border border-blue-100">
                        请确保 ID 唯一。支持 Native 和 API 类型的技能配置。
                    </p>
                </div>
            </Modal>
        </div>
    );
};
