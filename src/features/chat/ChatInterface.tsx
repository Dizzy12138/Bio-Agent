import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, ChevronDown, X, Users, Clock, Plus } from 'lucide-react';
import { Button } from '../../components/common';
import { useChatStore } from '../../stores';
import { MessageList } from './MessageList';
import { ChatHistory } from './components/ChatHistory';
import { ConversationExportModal } from './components/ConversationExportModal';
import type { Conversation } from '../../types';
import './ChatInterface.css';

// 专家数据类型
interface Expert {
    id: string;
    name: string;
    avatar: string;
    domain: string;
    description: string;
}

// 预设专家列表
const AVAILABLE_EXPERTS: Expert[] = [
    {
        id: 'expert-1',
        name: '创面护理专家',
        avatar: '🩹',
        domain: '创面护理',
        description: '专注于慢性创面护理，熟悉各类敷料材料和治疗方案',
    },
    {
        id: 'expert-2',
        name: '生物材料分析师',
        avatar: '🧬',
        domain: '生物材料',
        description: '专业分析生物材料的理化性能和生物相容性',
    },
    {
        id: 'expert-3',
        name: '文献综述助手',
        avatar: '📚',
        domain: '文献分析',
        description: '高效检索和分析学术文献，帮助快速了解研究前沿',
    },
];

export const ChatInterface: React.FC = () => {
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
    const [showExpertSelector, setShowExpertSelector] = useState(false);
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportConversation, setExportConversation] = useState<Conversation | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const selectorRef = useRef<HTMLDivElement>(null);
    const {
        addMessage,
        isStreaming,
        setStreaming,
        currentConversation,
        setCurrentConversation,
        createNewConversation,
        setCurrentExpert,
    } = useChatStore();

    // 处理选择对话
    const handleSelectConversation = (conversation: Conversation) => {
        setCurrentConversation(conversation);
        if (conversation.expertId) {
            const expert = AVAILABLE_EXPERTS.find(e => e.id === conversation.expertId);
            if (expert) setSelectedExpert(expert);
        } else {
            setSelectedExpert(null);
        }
        setShowHistory(false);
    };

    // 新建对话
    const handleNewConversation = () => {
        createNewConversation(
            selectedExpert?.id,
            selectedExpert?.name,
            selectedExpert?.avatar
        );
        setShowHistory(false);
    };

    // 导出对话
    const handleExportConversation = (conversation: Conversation) => {
        setExportConversation(conversation);
        setShowExportModal(true);
        setShowHistory(false);
    };

    // 自动调整输入框高度
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
        }
    }, [inputValue]);

    // 点击外部关闭选择器
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
                setShowExpertSelector(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 检测 @ 符号
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // 检测是否输入了 @
        const lastAtIndex = value.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const textAfterAt = value.substring(lastAtIndex + 1);
            // 如果 @ 后面没有空格，显示提及列表
            if (!textAfterAt.includes(' ')) {
                setShowMentionList(true);
                setMentionFilter(textAfterAt.toLowerCase());
            } else {
                setShowMentionList(false);
            }
        } else {
            setShowMentionList(false);
        }
    };

    // 选择提及的专家
    const handleMentionSelect = (expert: Expert) => {
        const lastAtIndex = inputValue.lastIndexOf('@');
        const newValue = inputValue.substring(0, lastAtIndex) + `@${expert.name} `;
        setInputValue(newValue);
        setSelectedExpert(expert);
        setShowMentionList(false);
        inputRef.current?.focus();
    };

    // 选择专家
    const handleExpertSelect = (expert: Expert | null) => {
        setSelectedExpert(expert);
        setShowExpertSelector(false);
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isStreaming) return;

        // 添加用户消息
        const userMessage = {
            id: `msg-${Date.now()}`,
            role: 'user' as const,
            content: inputValue.trim(),
            timestamp: new Date().toISOString(),
            expertId: selectedExpert?.id,
            expertName: selectedExpert?.name,
        };
        addMessage(userMessage);
        setInputValue('');

        // 模拟AI响应
        setStreaming(true);

        // 根据选择的专家生成不同的响应
        setTimeout(() => {
            const assistantMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant' as const,
                content: generateMockResponse(inputValue, selectedExpert),
                timestamp: new Date().toISOString(),
                expertId: selectedExpert?.id,
                expertName: selectedExpert?.name,
                expertAvatar: selectedExpert?.avatar,
                metadata: selectedExpert ? {
                    toolCalls: generateToolCalls(selectedExpert),
                    citations: generateCitations(selectedExpert),
                } : undefined,
            };
            addMessage(assistantMessage);
            setStreaming(false);
        }, 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 过滤专家列表
    const filteredExperts = AVAILABLE_EXPERTS.filter(expert =>
        expert.name.toLowerCase().includes(mentionFilter) ||
        expert.domain.toLowerCase().includes(mentionFilter)
    );

    return (
        <div className="chat-interface">
            {/* 对话历史面板 */}
            <ChatHistory
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onExportConversation={handleExportConversation}
            />

            {/* 对话导出模态框 */}
            <ConversationExportModal
                isOpen={showExportModal}
                conversation={exportConversation}
                messages={currentConversation?.id === exportConversation?.id ? (currentConversation?.messages || []) : []}
                onClose={() => {
                    setShowExportModal(false);
                    setExportConversation(null);
                }}
            />

            <div className="chat-header">
                <div className="chat-header-left">
                    <button
                        className="history-trigger-btn"
                        onClick={() => setShowHistory(true)}
                        title="对话历史"
                    >
                        <Clock size={20} />
                    </button>
                    <div className="chat-title-area">
                        <h2>{currentConversation?.title || 'BioMed Agent'}</h2>
                        {currentConversation && (
                            <span className="conversation-badge">对话中</span>
                        )}
                    </div>
                    {selectedExpert && (
                        <div className="active-expert-badge">
                            <span className="expert-avatar-small">{selectedExpert.avatar}</span>
                            <span>{selectedExpert.name}</span>
                            <button
                                className="remove-expert-btn"
                                onClick={() => {
                                    setSelectedExpert(null);
                                    setCurrentExpert(null);
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
                <div className="chat-header-right">
                    <div className="expert-selector" ref={selectorRef}>
                        <button
                            className="expert-selector-btn"
                            onClick={() => setShowExpertSelector(!showExpertSelector)}
                        >
                            <Users size={18} />
                            <span>切换专家</span>
                            <ChevronDown size={16} />
                        </button>

                        {showExpertSelector && (
                            <div className="expert-dropdown">
                                <div className="dropdown-header">选择专家助手</div>
                                <button
                                    className={`expert-option ${!selectedExpert ? 'selected' : ''}`}
                                    onClick={() => handleExpertSelect(null)}
                                >
                                    <span className="expert-option-avatar">🤖</span>
                                    <div className="expert-option-info">
                                        <span className="expert-option-name">通用助手</span>
                                        <span className="expert-option-desc">综合分析与建议</span>
                                    </div>
                                </button>
                                {AVAILABLE_EXPERTS.map(expert => (
                                    <button
                                        key={expert.id}
                                        className={`expert-option ${selectedExpert?.id === expert.id ? 'selected' : ''}`}
                                        onClick={() => handleExpertSelect(expert)}
                                    >
                                        <span className="expert-option-avatar">{expert.avatar}</span>
                                        <div className="expert-option-info">
                                            <span className="expert-option-name">{expert.name}</span>
                                            <span className="expert-option-desc">{expert.domain}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        className="new-conversation-btn"
                        onClick={handleNewConversation}
                        title="新对话"
                    >
                        <Plus size={18} />
                        新对话
                    </button>
                    <span className="agent-status">
                        <span className="status-dot active" />
                        在线
                    </span>
                </div>
            </div>

            <MessageList />

            <div className="chat-input-area">
                {/* @提及建议列表 */}
                {showMentionList && filteredExperts.length > 0 && (
                    <div className="mention-list">
                        {filteredExperts.map(expert => (
                            <button
                                key={expert.id}
                                className="mention-option"
                                onClick={() => handleMentionSelect(expert)}
                            >
                                <span className="mention-avatar">{expert.avatar}</span>
                                <div className="mention-info">
                                    <span className="mention-name">{expert.name}</span>
                                    <span className="mention-domain">{expert.domain}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="input-container">
                    <button className="input-action-btn" title="上传文件">
                        <Paperclip size={20} />
                    </button>

                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        placeholder={selectedExpert
                            ? `正在与 ${selectedExpert.name} 对话，输入 @ 可切换专家...`
                            : '输入问题，或使用 @专家名 调用特定专家...'}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isStreaming}
                    />

                    <button
                        className={`input-action-btn ${isRecording ? 'recording' : ''}`}
                        onClick={() => setIsRecording(!isRecording)}
                        title={isRecording ? '停止录音' : '语音输入'}
                    >
                        {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                    </button>

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isStreaming}
                        isLoading={isStreaming}
                    >
                        <Send size={18} />
                    </Button>
                </div>

                <p className="input-hint">
                    按 Enter 发送，Shift + Enter 换行 | 输入 <code>@</code> 可调用专家
                </p>
            </div>
        </div>
    );
};

// 根据专家生成模拟响应
function generateMockResponse(query: string, expert: Expert | null): string {
    if (!expert) {
        return `我已收到您的问题，正在为您综合分析。

如果您需要特定领域的专业建议，可以：
1. 使用右上角的"切换专家"选择专家
2. 在输入框中输入 \`@专家名\` 调用特定专家

我可以帮助您进行创面护理、材料分析、文献综述等多个领域的咨询。`;
    }

    switch (expert.id) {
        case 'expert-1': // 创面护理专家
            return `## 🩹 创面护理建议

根据您的描述，我从创面护理专业角度为您分析：

### 创面评估要点

1. **创面分期**：需要确认创面处于哪个愈合阶段
   - 炎症期 (0-4天)
   - 增殖期 (4-21天)
   - 重塑期 (21天-2年)

2. **渗出液评估**
   - 量：少量/中等/大量
   - 性状：浆液性/血性/脓性

### 推荐敷料选择

| 创面类型 | 推荐敷料 | 更换频率 |
|---------|---------|---------|
| 干燥创面 | 水凝胶敷料 | 2-3天 |
| 中等渗出 | 泡沫敷料 | 3-5天 |
| 高渗出 | 藻酸盐敷料 | 1-2天 |

> 💡 如需更详细的治疗方案，请提供创面照片或更多临床信息。`;

        case 'expert-2': // 生物材料分析师
            return `## 🧬 生物材料分析报告

基于您的需求，我从材料科学角度进行分析：

### 材料特性对比

\`\`\`
海藻酸钠水凝胶
├── 溶胀率: 800-1200%
├── 孔隙率: 70-85%
├── 降解周期: 14-28天
└── 生物相容性: 优秀

壳聚糖复合材料
├── 抗菌活性: 强
├── 机械强度: 中等
├── 细胞粘附: 良好
└── 成本效益: 高
\`\`\`

### 推荐配方

根据目标应用场景，建议采用以下配方：
- **基质**: 海藻酸钠 2% (w/v)
- **增强剂**: 壳聚糖 1% (w/v)
- **交联剂**: CaCl₂ 0.5M

### 文献参考

已为您检索到 **15篇** 相关高质量文献，需要我生成文献综述吗？`;

        case 'expert-3': // 文献综述助手
            return `## 📚 文献检索报告

根据您的研究主题，我已完成初步文献检索：

### 检索结果概览

- **检索数据库**: PubMed, Web of Science, Scopus
- **时间范围**: 2019-2024
- **相关文献**: 127篇
- **高引用论文**: 23篇

### 研究热点分析

1. **智能响应型水凝胶** (45篇)
   - pH响应、温敏、光响应材料
   
2. **抗菌功能化** (38篇)
   - 银纳米颗粒、抗菌肽、季铵盐

3. **生长因子递送** (28篇)
   - VEGF、EGF、bFGF缓释系统

### 核心文献推荐

1. Zhang et al. (2023) *Nature Communications* - IF: 16.6
2. Wang et al. (2024) *Biomaterials* - IF: 14.0
3. Liu et al. (2023) *Advanced Materials* - IF: 29.4

> 需要我为您生成完整的文献综述或思维导图吗？`;

        default:
            return '我已收到您的问题，正在分析中...';
    }
}

// 生成工具调用
function generateToolCalls(expert: Expert) {
    switch (expert.id) {
        case 'expert-1':
            return [{
                id: 'tool-1',
                name: 'wound_assessment',
                arguments: { type: 'chronic', stage: 'proliferation' },
                result: { recommendation: 'hydrogel_dressing' },
                status: 'success' as const,
            }];
        case 'expert-2':
            return [{
                id: 'tool-1',
                name: 'material_database_query',
                arguments: { material: 'alginate', property: 'swelling_ratio' },
                result: { value: '800-1200%', unit: 'percentage' },
                status: 'success' as const,
            }];
        case 'expert-3':
            return [{
                id: 'tool-1',
                name: 'literature_search',
                arguments: { keywords: ['hydrogel', 'wound healing'], limit: 50 },
                result: { total: 127, high_cited: 23 },
                status: 'success' as const,
            }];
        default:
            return [];
    }
}

// 生成引用
function generateCitations(expert: Expert) {
    switch (expert.id) {
        case 'expert-1':
            return [{
                id: 'cite-1',
                title: 'Advanced wound dressings for chronic wound management',
                authors: ['Chen L.', 'Zhang H.'],
                source: 'Journal of Wound Care, 2024',
                snippet: '...hydrogel dressings showed superior moisture management...',
            }];
        case 'expert-2':
            return [{
                id: 'cite-1',
                title: 'Sodium alginate hydrogels: preparation and properties',
                authors: ['Lee S.', 'Kim J.'],
                source: 'Carbohydrate Polymers, 2023',
                snippet: '...swelling ratio reached 1200% under physiological conditions...',
            }];
        case 'expert-3':
            return [{
                id: 'cite-1',
                title: 'Smart hydrogels for wound healing: A comprehensive review',
                authors: ['Zhang Y.', 'Wang L.', 'Liu M.'],
                source: 'Nature Communications, 2023',
                snippet: '...stimulus-responsive materials represent a promising direction...',
            }];
        default:
            return [];
    }
}

