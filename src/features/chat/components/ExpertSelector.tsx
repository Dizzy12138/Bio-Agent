import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Plus } from 'lucide-react';
import { Button } from '../../../components/common';
import { AVAILABLE_EXPERTS, type Expert } from '../../../constants/experts';

interface ExpertSelectorProps {
    selectedExpert: Expert | null;
    onSelect: (expert: Expert | null) => void;
    onNewConversation: () => void;
}

export const ExpertSelector: React.FC<ExpertSelectorProps> = ({
    selectedExpert,
    onSelect,
    onNewConversation
}) => {
    const [showExpertSelector, setShowExpertSelector] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);

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

    const handleSelect = (expert: Expert | null) => {
        onSelect(expert);
        setShowExpertSelector(false);
    };

    return (
        <>
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
                            onClick={() => handleSelect(null)}
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
                                onClick={() => handleSelect(expert)}
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
                onClick={onNewConversation}
                leftIcon={<Plus size={16} />}
                size="sm"
            >
                新对话
            </Button>
        </>
    );
};
