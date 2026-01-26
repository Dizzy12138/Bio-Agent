import React, { useState, useCallback } from 'react';
import { Play, RotateCcw, History, AlertCircle } from 'lucide-react';
import './StructureEditor.css';

interface StructureEditorProps {
    value: string;
    onChange: (smiles: string) => void;
    onAnalyze: () => void;
    loading?: boolean;
}

// 常用分子模板
const MOLECULE_TEMPLATES = [
    { name: 'Aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
    { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
    { name: 'Ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O' },
    { name: 'Paracetamol', smiles: 'CC(=O)NC1=CC=C(C=C1)O' },
    { name: 'Glucose', smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O' },
];

/**
 * StructureEditor - SMILES 结构编辑器
 * 
 * 支持 SMILES 字符串输入和常用分子模板选择
 */
export const StructureEditor: React.FC<StructureEditorProps> = ({
    value,
    onChange,
    onAnalyze,
    loading = false
}) => {
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // 处理输入变化
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setError(null);
        onChange(newValue);
    }, [onChange]);

    // 应用模板
    const applyTemplate = useCallback((smiles: string) => {
        if (value && !history.includes(value)) {
            setHistory(prev => [value, ...prev].slice(0, 10));
        }
        onChange(smiles);
        setError(null);
    }, [value, history, onChange]);

    // 从历史记录恢复
    const restoreFromHistory = useCallback((smiles: string) => {
        onChange(smiles);
        setShowHistory(false);
    }, [onChange]);

    // 清空输入
    const handleClear = useCallback(() => {
        if (value) {
            setHistory(prev => [value, ...prev].slice(0, 10));
        }
        onChange('');
        setError(null);
    }, [value, onChange]);

    // 执行分析
    const handleAnalyze = useCallback(() => {
        if (!value.trim()) {
            setError('请输入 SMILES 字符串');
            return;
        }

        // 简单的 SMILES 格式验证
        const validChars = /^[A-Za-z0-9@\[\]\(\)\=\#\-\+\.\\/\%]+$/;
        if (!validChars.test(value.replace(/\s/g, ''))) {
            setError('SMILES 格式无效，请检查输入');
            return;
        }

        setError(null);
        onAnalyze();
    }, [value, onAnalyze]);

    return (
        <div className="structure-editor">
            <header className="structure-editor__header">
                <h4>✏️ 分子输入</h4>
                <div className="structure-editor__actions">
                    <button
                        className="structure-editor__btn structure-editor__btn--icon"
                        onClick={() => setShowHistory(!showHistory)}
                        disabled={history.length === 0}
                        title="历史记录"
                    >
                        <History size={16} />
                    </button>
                    <button
                        className="structure-editor__btn structure-editor__btn--icon"
                        onClick={handleClear}
                        disabled={!value}
                        title="清空"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            </header>

            {/* 历史记录下拉 */}
            {showHistory && history.length > 0 && (
                <div className="structure-editor__history">
                    <div className="structure-editor__history-title">历史记录</div>
                    {history.map((item, index) => (
                        <button
                            key={index}
                            className="structure-editor__history-item"
                            onClick={() => restoreFromHistory(item)}
                        >
                            <code>{item.length > 40 ? item.slice(0, 40) + '...' : item}</code>
                        </button>
                    ))}
                </div>
            )}

            {/* SMILES 输入区 */}
            <div className="structure-editor__input-section">
                <label className="structure-editor__label">SMILES 字符串</label>
                <textarea
                    className={`structure-editor__textarea ${error ? 'error' : ''}`}
                    value={value}
                    onChange={handleInputChange}
                    placeholder="输入 SMILES 字符串，例如：CC(=O)OC1=CC=CC=C1C(=O)O"
                    rows={3}
                />
                {error && (
                    <div className="structure-editor__error">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}
            </div>

            {/* 分析按钮 */}
            <button
                className="structure-editor__analyze-btn"
                onClick={handleAnalyze}
                disabled={loading || !value.trim()}
            >
                {loading ? (
                    <>
                        <span className="structure-editor__spinner" />
                        分析中...
                    </>
                ) : (
                    <>
                        <Play size={18} />
                        分析分子
                    </>
                )}
            </button>

            {/* 快速模板 */}
            <div className="structure-editor__templates">
                <div className="structure-editor__templates-title">快速选择</div>
                <div className="structure-editor__templates-list">
                    {MOLECULE_TEMPLATES.map(template => (
                        <button
                            key={template.name}
                            className="structure-editor__template-btn"
                            onClick={() => applyTemplate(template.smiles)}
                        >
                            {template.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
