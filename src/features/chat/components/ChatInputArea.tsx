import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, Bot } from 'lucide-react';
import { Button } from '../../../components/common';
import type { Expert } from '../../../constants/experts';

interface ChatInputAreaProps {
    inputValue: string;
    onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSend: () => void;
    isStreaming: boolean;
    isRecording: boolean;
    onToggleRecording: () => void;
    selectedExpert: Expert | null;
    onMentionSelect: (expert: Expert) => void;
    showMentionList: boolean;
    filteredExperts: Expert[];
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
    inputValue,
    onInputChange,
    onSend,
    isStreaming,
    isRecording,
    onToggleRecording,
    selectedExpert,
    onMentionSelect,
    showMentionList,
    filteredExperts
}) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 自动调整输入框高度
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
        }
    }, [inputValue]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="p-4 bg-white border-t border-gray-100 relative">
            {/* Mention List */}
            {showMentionList && filteredExperts.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-2">
                    {filteredExperts.map(expert => (
                        <button
                            key={expert.id}
                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                            onClick={() => onMentionSelect(expert)}
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
                        onChange={onInputChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isStreaming}
                    />

                    <div className="flex items-center gap-1 pb-1">
                        <button
                            className={`p-2 rounded-lg transition-colors ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                            onClick={onToggleRecording}
                            title={isRecording ? '停止录音' : '语音输入'}
                        >
                            {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                        </button>
                        <Button
                            size="sm"
                            onClick={onSend}
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
    );
};
