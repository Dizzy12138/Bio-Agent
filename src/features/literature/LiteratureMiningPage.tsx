import React, { useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { NetworkGraph, EvidenceList, TrendChart, WordCloud } from './components';
import { PageHeader } from '../../components/PageHeader';
import type {
    GraphData,
    GraphNode,
    Publication,
    TrendData,
    WordCloudItem
} from './types';
import './LiteratureMiningPage.css';

// ============================================
// Mock Data - 模拟数据
// ============================================

const generateMockGraphData = (query: string): GraphData => {
    const centerNode: GraphNode = {
        id: 'center',
        label: query || 'TP53',
        type: 'gene',
        size: 30,
        x: 300,
        y: 200,
        selected: true
    };

    const relatedNodes: GraphNode[] = [
        { id: 'n1', label: 'MDM2', type: 'gene', size: 20, x: 150, y: 100 },
        { id: 'n2', label: 'BRCA1', type: 'gene', size: 18, x: 450, y: 100 },
        { id: 'n3', label: 'Breast Cancer', type: 'disease', size: 25, x: 500, y: 250 },
        { id: 'n4', label: 'Lung Cancer', type: 'disease', size: 22, x: 450, y: 350 },
        { id: 'n5', label: 'Nutlin-3', type: 'drug', size: 16, x: 100, y: 200 },
        { id: 'n6', label: 'Doxorubicin', type: 'drug', size: 18, x: 100, y: 300 },
        { id: 'n7', label: 'p21', type: 'protein', size: 16, x: 200, y: 350 },
        { id: 'n8', label: 'Cell Cycle', type: 'pathway', size: 20, x: 350, y: 350 },
    ];

    const edges = [
        { id: 'e1', source: 'center', target: 'n1', weight: 0.9, type: 'binding' as const },
        { id: 'e2', source: 'center', target: 'n2', weight: 0.7, type: 'association' as const },
        { id: 'e3', source: 'center', target: 'n3', weight: 0.8, type: 'association' as const },
        { id: 'e4', source: 'center', target: 'n4', weight: 0.6, type: 'association' as const },
        { id: 'e5', source: 'center', target: 'n5', weight: 0.5, type: 'inhibition' as const },
        { id: 'e6', source: 'center', target: 'n6', weight: 0.4, type: 'activation' as const },
        { id: 'e7', source: 'center', target: 'n7', weight: 0.8, type: 'activation' as const },
        { id: 'e8', source: 'center', target: 'n8', weight: 0.7, type: 'association' as const },
        { id: 'e9', source: 'n1', target: 'n5', weight: 0.6, type: 'binding' as const },
        { id: 'e10', source: 'n3', target: 'n2', weight: 0.5, type: 'association' as const },
    ];

    return { nodes: [centerNode, ...relatedNodes], edges };
};

const mockPublications: Publication[] = [
    {
        id: 'pub1',
        pmid: '35123456',
        title: 'TP53 mutations and their impact on cancer progression and therapeutic resistance',
        authors: ['Zhang W', 'Li H', 'Chen X', 'Wang Y'],
        journal: 'Nature Reviews Cancer',
        year: 2024,
        abstract: 'TP53 is the most frequently mutated gene in human cancers. This review discusses the molecular mechanisms by which TP53 mutations contribute to cancer progression and resistance to therapy. We highlight recent advances in targeting mutant p53 for cancer treatment, including MDM2 inhibitors like Nutlin-3 and novel strategies to restore wild-type p53 function.',
        highlights: [
            { text: 'TP53', start: 0, end: 4, entityType: 'gene', entityId: 'center' },
            { text: 'MDM2', start: 286, end: 290, entityType: 'gene', entityId: 'n1' },
            { text: 'Nutlin-3', start: 307, end: 315, entityType: 'drug', entityId: 'n5' },
        ],
        relatedEntities: ['center', 'n1', 'n5']
    },
    {
        id: 'pub2',
        pmid: '35234567',
        title: 'BRCA1-TP53 interaction in DNA damage response and tumor suppression',
        authors: ['Johnson M', 'Smith A', 'Brown K'],
        journal: 'Cell',
        year: 2023,
        abstract: 'The interaction between BRCA1 and TP53 plays a critical role in maintaining genomic stability. We demonstrate that BRCA1 enhances TP53-dependent apoptosis in response to DNA damage, with implications for breast cancer treatment.',
        highlights: [
            { text: 'BRCA1', start: 24, end: 29, entityType: 'gene', entityId: 'n2' },
            { text: 'TP53', start: 34, end: 38, entityType: 'gene', entityId: 'center' },
            { text: 'breast cancer', start: 203, end: 216, entityType: 'disease', entityId: 'n3' },
        ],
        relatedEntities: ['center', 'n2', 'n3']
    },
    {
        id: 'pub3',
        pmid: '35345678',
        title: 'p21 as a downstream effector of p53 in cell cycle arrest',
        authors: ['Lee S', 'Kim J', 'Park H'],
        journal: 'Molecular Cell',
        year: 2023,
        abstract: 'p21 is a key mediator of TP53-induced cell cycle arrest. Our study reveals novel mechanisms by which p53 regulates p21 expression and its implications for cancer therapy targeting the cell cycle pathway.',
        highlights: [
            { text: 'p21', start: 0, end: 3, entityType: 'protein', entityId: 'n7' },
            { text: 'TP53', start: 32, end: 36, entityType: 'gene', entityId: 'center' },
            { text: 'cell cycle', start: 45, end: 55, entityType: 'pathway', entityId: 'n8' },
        ],
        relatedEntities: ['center', 'n7', 'n8']
    }
];

const mockTrendData: TrendData = {
    entityId: 'center',
    entityName: 'TP53',
    totalCount: 45678,
    data: [
        { year: 2015, count: 3200, growthRate: 0 },
        { year: 2016, count: 3450, growthRate: 0.078 },
        { year: 2017, count: 3800, growthRate: 0.101 },
        { year: 2018, count: 4100, growthRate: 0.079 },
        { year: 2019, count: 4500, growthRate: 0.098 },
        { year: 2020, count: 4200, growthRate: -0.067 },
        { year: 2021, count: 4800, growthRate: 0.143 },
        { year: 2022, count: 5200, growthRate: 0.083 },
        { year: 2023, count: 5800, growthRate: 0.115 },
        { year: 2024, count: 6400, growthRate: 0.103 },
    ]
};

const mockWordCloud: WordCloudItem[] = [
    { text: 'mutation', value: 156, entityType: undefined },
    { text: 'apoptosis', value: 120, entityType: undefined },
    { text: 'MDM2', value: 98, entityType: 'gene' },
    { text: 'DNA damage', value: 89, entityType: undefined },
    { text: 'tumor suppressor', value: 85, entityType: undefined },
    { text: 'cell cycle', value: 78, entityType: 'pathway' },
    { text: 'BRCA1', value: 72, entityType: 'gene' },
    { text: 'breast cancer', value: 68, entityType: 'disease' },
    { text: 'chemotherapy', value: 62, entityType: undefined },
    { text: 'p21', value: 58, entityType: 'protein' },
    { text: 'transcription', value: 54, entityType: undefined },
    { text: 'lung cancer', value: 48, entityType: 'disease' },
];

// ============================================
// Component
// ============================================

/**
 * LiteratureMiningPage - 文献挖掘主页面
 * 
 * NLP 驱动的文献知识发现平台
 * 提供知识图谱、证据卡片、趋势分析等功能
 */
export const LiteratureMiningPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('TP53');
    const [loading, setLoading] = useState(false);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    const [graphData, setGraphData] = useState<GraphData>(() => generateMockGraphData('TP53'));
    const [publications, setPublications] = useState<Publication[]>(mockPublications);
    const [trendData, setTrendData] = useState<TrendData | null>(mockTrendData);
    const [wordCloud] = useState<WordCloudItem[]>(mockWordCloud);

    // 处理搜索
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);

        // 模拟 API 调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        setGraphData(generateMockGraphData(searchQuery));
        setPublications(mockPublications);
        setTrendData({ ...mockTrendData, entityName: searchQuery });
        setLoading(false);
    }, [searchQuery]);

    // 处理节点点击
    const handleNodeClick = useCallback((node: GraphNode) => {
        setSelectedNode(node);
        // 可以在这里加载该节点相关的文献
        console.log('Selected node:', node);
    }, []);

    // 处理实体点击
    const handleEntityClick = useCallback((entityId: string) => {
        const node = graphData.nodes.find(n => n.id === entityId);
        if (node) {
            setSelectedNode(node);
        }
    }, [graphData.nodes]);

    // 处理词云点击
    const handleWordClick = useCallback((word: WordCloudItem) => {
        if (word.entityId) {
            handleEntityClick(word.entityId);
        } else {
            setSearchQuery(word.text);
        }
    }, [handleEntityClick]);

    return (
        <div className="literature-mining-page">
            {/* 顶部搜索栏 */}
            <PageHeader
                icon="📚"
                title="文献智能挖掘"
                subtitle="基于 NLP 的知识发现与关系提取"
            >
                <div className="literature-mining-page__search">
                    <div className="literature-mining-page__search-input-wrapper">
                        <Search size={20} className="literature-mining-page__search-icon" />
                        <input
                            type="text"
                            className="literature-mining-page__search-input"
                            placeholder="输入基因、药物、疾病名称..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <button
                        className="literature-mining-page__search-btn"
                        onClick={handleSearch}
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : '挖掘'}
                    </button>
                </div>
            </PageHeader>

            {/* 主内容区 */}
            <div className="literature-mining-page__content">
                {/* 左侧：知识图谱 */}
                <div className="literature-mining-page__graph-section">
                    <NetworkGraph
                        data={graphData}
                        selectedNodeId={selectedNode?.id}
                        onNodeClick={handleNodeClick}
                    />
                </div>

                {/* 右侧：详情面板 */}
                <aside className="literature-mining-page__sidebar">
                    {/* 趋势图 */}
                    <TrendChart data={trendData} loading={loading} />

                    {/* 词云 */}
                    <WordCloud
                        words={wordCloud}
                        loading={loading}
                        onWordClick={handleWordClick}
                    />

                    {/* 证据列表 */}
                    <div className="literature-mining-page__evidence-section">
                        <h4 className="literature-mining-page__section-title">
                            📄 相关文献
                            <span className="literature-mining-page__evidence-count">
                                {publications.length} 篇
                            </span>
                        </h4>
                        <EvidenceList
                            publications={publications}
                            loading={loading}
                            onEntityClick={handleEntityClick}
                        />
                    </div>
                </aside>
            </div>
        </div>
    );
};
