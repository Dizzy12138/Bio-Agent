import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, ChevronDown, X, Users, Clock, Plus, Bot, Sparkles } from 'lucide-react';
import { Button } from '../../components/common';
import { useChatStore } from '../../stores';
import { MessageList } from './MessageList';
import { ChatHistory } from './components/ChatHistory';
import { ConversationExportModal } from './components/ConversationExportModal';
import type { Conversation } from '../../types';

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
        <div className="flex flex-col h-[calc(100vh-64px)] bg-white relative">
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

            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setShowHistory(true)}
                        title="对话历史"
                    >
                        <Clock size={20} />
                    </button>

                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {currentConversation?.title || 'BioMed Agent'}
                            {currentConversation && (
                                <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full font-medium">进行中</span>
                            )}
                        </h2>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            System Online
                        </div>
                    </div>

                    {selectedExpert && (
                        <div className="flex items-center gap-2 pl-4 border-l border-gray-200 ml-2">
                            <span className="text-xl animate-in zoom-in spin-in-12 duration-300">{selectedExpert.avatar}</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-800">{selectedExpert.name}</span>
                                <span className="text-[10px] text-gray-500">{selectedExpert.domain}</span>
                            </div>
                            <button
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors ml-1"
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

                <div className="flex items-center gap-3">
                    {/* Expert Selector */}
                    <div className="relative" ref={selectorRef}>
                        <button
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${showExpertSelector
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            onClick={() => setShowExpertSelector(!showExpertSelector)}
                        >
                            <Users size={16} />
                            <span>切换专家</span>
                            <ChevronDown size={14} className={`transition-transform ${showExpertSelector ? 'rotate-180' : ''}`} />
                        </button>

                        {showExpertSelector && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">选择专家助手</div>
                                <button
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${!selectedExpert ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}
                                    onClick={() => handleExpertSelect(null)}
                                >
                                    <span className="text-xl bg-gray-100 p-1.5 rounded-lg">🤖</span>
                                    <div>
                                        <div className="font-semibold text-sm">通用助手</div>
                                        <div className="text-xs text-opacity-70 mt-0.5">综合分析与建议</div>
                                    </div>
                                </button>
                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                {AVAILABLE_EXPERTS.map(expert => (
                                    <button
                                        key={expert.id}
                                        className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${selectedExpert?.id === expert.id ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleExpertSelect(expert)}
                                    >
                                        <span className="text-xl bg-gray-100 p-1.5 rounded-lg">{expert.avatar}</span>
                                        <div>
                                            <div className="font-semibold text-sm">{expert.name}</div>
                                            <div className="text-xs text-opacity-70 mt-0.5">{expert.domain}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleNewConversation}
                        leftIcon={<Plus size={16} />}
                        size="sm"
                    >
                        新对话
                    </Button>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-hidden relative bg-gray-50/30 flex flex-col">
                <MessageList />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 relative">
                {/* Mention List */}
                {showMentionList && filteredExperts.length > 0 && (
                    <div className="absolute bottom-full left-4 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-2">
                        {filteredExperts.map(expert => (
                            <button
                                key={expert.id}
                                className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                onClick={() => handleMentionSelect(expert)}
                            >
                                <span className="text-lg">{expert.avatar}</span>
                                <div>
                                    <div className="font-medium text-sm text-gray-900">{expert.name}</div>
                                    <div className="text-xs text-gray-500">{expert.domain}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="max-w-4xl mx-auto w-full">
                    <div className="relative flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="上传文件">
                            <Paperclip size={20} />
                        </button>

                        <textarea
                            ref={inputRef}
                            className="flex-1 bg-transparent border-0 focus:ring-0 p-2 text-gray-800 placeholder-gray-400 text-sm resize-none max-h-32 min-h-[40px] leading-relaxed"
                            placeholder={selectedExpert
                                ? `正在与 ${selectedExpert.name} 对话，输入 @ 可切换专家...`
                                : '输入问题，或使用 @专家名 调用特定专家...'}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={isStreaming}
                        />

                        <div className="flex items-center gap-1 pb-1">
                            <button
                                className={`p-2 rounded-lg transition-colors ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                                onClick={() => setIsRecording(!isRecording)}
                                title={isRecording ? '停止录音' : '语音输入'}
                            >
                                {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                            </button>
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isStreaming}
                                isLoading={isStreaming}
                                className="rounded-xl px-4"
                            >
                                <Send size={18} />
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 px-2">
                        <p className="text-xs text-gray-400">
                            按 Enter 发送，Shift + Enter 换行
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                                <Bot size={12} />
                                AI 生成内容仅供参考
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 根据专家生成模拟响应
function generateMockResponse(_query: string, expert: Expert | null): string {
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
