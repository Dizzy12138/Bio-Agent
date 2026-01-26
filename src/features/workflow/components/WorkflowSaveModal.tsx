import React, { useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { WorkflowSaveData } from '../types';
import '../WorkflowManager.css';

interface WorkflowSaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: WorkflowSaveData) => void;
    initialData?: Partial<WorkflowSaveData>;
}

export type { WorkflowSaveData };

const categories = [
    { id: 'wound-care', name: '创面护理' },
    { id: 'material-analysis', name: '材料分析' },
    { id: 'literature-review', name: '文献综述' },
    { id: 'other', name: '其他' },
];

export const WorkflowSaveModal: React.FC<WorkflowSaveModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}) => {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [category, setCategory] = useState(initialData?.category || 'other');
    const [tags, setTags] = useState<string[]>(initialData?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [versionNote, setVersionNote] = useState('');

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSave = () => {
        if (!name.trim()) return;

        onSave({
            name: name.trim(),
            description: description.trim(),
            category,
            tags,
            versionNote: versionNote.trim(),
        });
    };

    const modalContent = (
        <div className="workflow-manager-overlay" onClick={handleBackdropClick}>
            <div className="save-modal">
                <header className="save-modal-header">
                    <h2 className="save-modal-title">保存工作流</h2>
                </header>

                <div className="save-modal-body">
                    {/* 名称 */}
                    <div className="save-form-group">
                        <label className="save-form-label required">工作流名称</label>
                        <input
                            type="text"
                            className="save-form-input"
                            placeholder="输入工作流名称"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* 描述 */}
                    <div className="save-form-group">
                        <label className="save-form-label">描述</label>
                        <textarea
                            className="save-form-input save-form-textarea"
                            placeholder="描述工作流的功能和用途"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* 分类 */}
                    <div className="save-form-group">
                        <label className="save-form-label">分类</label>
                        <select
                            className="save-form-input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 标签 */}
                    <div className="save-form-group">
                        <label className="save-form-label">标签</label>
                        <div className="save-form-tags">
                            {tags.map(tag => (
                                <span key={tag} className="save-form-tag">
                                    {tag}
                                    <span
                                        className="save-form-tag-remove"
                                        onClick={() => handleRemoveTag(tag)}
                                    >
                                        ×
                                    </span>
                                </span>
                            ))}
                            <input
                                type="text"
                                className="save-form-tag-input"
                                placeholder="输入标签后按回车"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                onBlur={handleAddTag}
                            />
                        </div>
                    </div>

                    {/* 版本说明 */}
                    <div className="save-form-group">
                        <label className="save-form-label">版本说明</label>
                        <textarea
                            className="save-form-input save-form-textarea"
                            placeholder="描述本次修改的内容（可选）"
                            value={versionNote}
                            onChange={(e) => setVersionNote(e.target.value)}
                            style={{ minHeight: '60px' }}
                        />
                    </div>
                </div>

                <footer className="save-modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>
                        取消
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!name.trim()}
                    >
                        保存
                    </button>
                </footer>
            </div>
        </div>
    );

    // 使用 Portal 将模态框渲染到 body - 仅在打开时渲染
    return isOpen ? createPortal(modalContent, document.body) : null;
};
