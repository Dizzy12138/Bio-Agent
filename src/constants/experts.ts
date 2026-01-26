// 专家数据类型
export interface Expert {
    id: string;
    name: string;
    avatar: string;
    domain: string;
    description: string;
}

// 预设专家列表
export const AVAILABLE_EXPERTS: Expert[] = [
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
