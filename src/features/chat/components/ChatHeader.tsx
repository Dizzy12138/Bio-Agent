import React from 'react';
import { Clock, X } from 'lucide-react';
import type { Expert } from '../../../constants/experts';
import type { Conversation } from '../../../types';

interface ChatHeaderProps {
    currentConversation: Conversation | null;
    selectedExpert: Expert | null;
    onShowHistory: () => void;
    onClearExpert: () => void;
    children?: React.ReactNode;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    currentConversation,
    selectedExpert,
    onShowHistory,
    onClearExpert,
    children
}) => {
    return (
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10 flex-shrink-0">
            <div className="flex items-center gap-4">
                <button
                    className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={onShowHistory}
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
                            onClick={onClearExpert}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {children}
            </div>
        </div>
    );
};
