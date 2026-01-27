import React from 'react';
import { Zap, Search, MessageSquare, Users } from 'lucide-react';
import type { Expert } from '../types';

interface ExpertListProps {
    systemExperts: Expert[];
    customExperts: Expert[];
    selectedExpert: Expert | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSelectExpert: (expert: Expert) => void;
    onCreateExpert: () => void;
    onOpenTemplates: () => void;
}

export const ExpertList: React.FC<ExpertListProps> = ({
    systemExperts,
    customExperts,
    selectedExpert,
    searchQuery,
    onSearchChange,
    onSelectExpert,
    onCreateExpert,
    onOpenTemplates,
}) => {
    return (
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 space-y-3">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={20} />
                    </div>
                    专家库
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Search size={14} />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400"
                        placeholder="搜索专家..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-50">
                <button
                    onClick={onCreateExpert}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors group"
                >
                    <div className="p-1.5 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform text-blue-600">
                        <MessageSquare size={16} />
                    </div>
                    <span className="text-xs font-medium">对话创建</span>
                </button>
                <button
                    onClick={onOpenTemplates}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100 transition-colors group"
                >
                    <div className="p-1.5 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform text-purple-600">
                        <Zap size={16} />
                    </div>
                    <span className="text-xs font-medium">从模板创建</span>
                </button>
            </div>


            {/* Expert List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
                {/* System Experts */}
                {systemExperts.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-1 text-xs font-bold text-gray-400 uppercase tracking-wider">系统专家</div>
                        <div className="space-y-1">
                            {systemExperts.map(expert => (
                                <ExpertCard
                                    key={expert.id}
                                    expert={expert}
                                    isSelected={selectedExpert?.id === expert.id}
                                    onClick={() => onSelectExpert(expert)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Custom Experts */}
                {customExperts.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-1 text-xs font-bold text-gray-400 uppercase tracking-wider">我的专家</div>
                        <div className="space-y-1">
                            {customExperts.map(expert => (
                                <ExpertCard
                                    key={expert.id}
                                    expert={expert}
                                    isSelected={selectedExpert?.id === expert.id}
                                    onClick={() => onSelectExpert(expert)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {systemExperts.length === 0 && customExperts.length === 0 && (
                    <div className="py-12 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                            <Search size={20} />
                        </div>
                        <p className="text-sm text-gray-400">没有找到匹配的专家</p>
                    </div>
                )}
            </div>
        </aside>
    );
};

// Expert Card Component
interface ExpertCardProps {
    expert: Expert;
    isSelected: boolean;
    onClick: () => void;
}

const ExpertCard: React.FC<ExpertCardProps> = ({ expert, isSelected, onClick }) => (
    <div
        className={`relative group p-3 rounded-xl transition-all cursor-pointer border ${isSelected
            ? 'bg-blue-50 border-blue-200 shadow-sm'
            : 'bg-white border-transparent hover:bg-gray-50 border-gray-100'
            }`}
        onClick={onClick}
    >
        <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-100'
                }`}>
                {expert.avatar}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {expert.name}
                    </h4>
                </div>
                <div className={`text-xs truncate ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                    {expert.domain}
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                    {expert.capabilities.slice(0, 2).map(cap => (
                        <span key={cap} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${isSelected
                            ? 'bg-white border-blue-100 text-blue-600'
                            : 'bg-gray-50 border-gray-100 text-gray-500'
                            }`}>
                            {cap}
                        </span>
                    ))}
                    {expert.capabilities.length > 2 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${isSelected
                            ? 'bg-white border-blue-100 text-blue-600'
                            : 'bg-gray-50 border-gray-100 text-gray-500'
                            }`}>
                            +{expert.capabilities.length - 2}
                        </span>
                    )}
                </div>
            </div>
        </div>

        {isSelected && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-xl"></div>
        )}
    </div>
);
