import React, { useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { PathwayMap, TraitCards, PhylogeneticTree, AbundanceChart } from './components';
import { PageHeader } from '../../components/PageHeader';
import type {
    Microbe,
    TraitGroup,
    AntibioticResistance,
    Pathway,
    PhylogeneticNode,
    AbundanceData
} from './types';
import './MicrobialTraitPage.css';

// ============================================
// Mock Data - 模拟数据
// ============================================

const mockMicrobe: Microbe = {
    id: 'ecoli',
    name: '大肠杆菌',
    scientificName: 'Escherichia coli K-12',
    taxonomy: {
        kingdom: 'Bacteria',
        phylum: 'Proteobacteria',
        class: 'Gammaproteobacteria',
        order: 'Enterobacterales',
        family: 'Enterobacteriaceae',
        genus: 'Escherichia',
        species: 'E. coli'
    }
};

const mockTraits: TraitGroup[] = [
    {
        category: 'morphology',
        label: '形态特征',
        icon: '🔬',
        traits: [
            { id: 't1', name: '革兰氏染色', category: 'morphology', value: '阴性', icon: '🧫' },
            { id: 't2', name: '细胞形状', category: 'morphology', value: '杆状' },
            { id: 't3', name: '运动能力', category: 'morphology', value: true, icon: '🏃' },
            { id: 't4', name: '孢子形成', category: 'morphology', value: false },
        ]
    },
    {
        category: 'physiology',
        label: '生理特性',
        icon: '🌡️',
        traits: [
            { id: 't5', name: '最适温度', category: 'physiology', value: 37, unit: '°C', icon: '🌡️' },
            { id: 't6', name: 'pH 耐受范围', category: 'physiology', value: '4.5 - 9.0' },
            { id: 't7', name: '氧气需求', category: 'physiology', value: '兼性厌氧' },
            { id: 't8', name: '盐度耐受', category: 'physiology', value: '≤6%', icon: '🧂' },
        ]
    },
    {
        category: 'metabolism',
        label: '代谢特征',
        icon: '⚗️',
        traits: [
            { id: 't9', name: '葡萄糖发酵', category: 'metabolism', value: true },
            { id: 't10', name: '乳糖发酵', category: 'metabolism', value: true },
            { id: 't11', name: '硝酸盐还原', category: 'metabolism', value: true },
            { id: 't12', name: '产气', category: 'metabolism', value: true },
        ]
    }
];

const mockResistances: AntibioticResistance[] = [
    { antibiotic: 'Ampicillin', category: 'β-lactams', resistant: true, gene: 'ampC' },
    { antibiotic: 'Tetracycline', category: 'Tetracyclines', resistant: true, mic: 32, gene: 'tetA' },
    { antibiotic: 'Ciprofloxacin', category: 'Fluoroquinolones', resistant: false, mic: 0.5 },
    { antibiotic: 'Gentamicin', category: 'Aminoglycosides', resistant: false, mic: 2 },
    { antibiotic: 'Trimethoprim', category: 'Sulfonamides', resistant: true, gene: 'dfrA' },
];

const mockPathway: Pathway = {
    id: 'glycolysis',
    name: '糖酵解途径 (Glycolysis)',
    description: '葡萄糖分解代谢的主要途径',
    completeness: 92,
    nodes: [
        { id: 'n1', label: 'Glucose', type: 'metabolite', x: 100, y: 50, present: true },
        { id: 'n2', label: 'HK', type: 'enzyme', x: 200, y: 100, present: true, externalId: 'EC 2.7.1.1' },
        { id: 'n3', label: 'G6P', type: 'metabolite', x: 300, y: 50, present: true },
        { id: 'n4', label: 'GPI', type: 'enzyme', x: 400, y: 100, present: true, externalId: 'EC 5.3.1.9' },
        { id: 'n5', label: 'F6P', type: 'metabolite', x: 500, y: 50, present: true },
        { id: 'n6', label: 'PFK', type: 'enzyme', x: 600, y: 100, present: true, externalId: 'EC 2.7.1.11' },
        { id: 'n7', label: 'F1,6BP', type: 'metabolite', x: 700, y: 50, present: true },
        { id: 'n8', label: 'ALDO', type: 'enzyme', x: 500, y: 200, present: true },
        { id: 'n9', label: 'G3P', type: 'metabolite', x: 400, y: 250, present: true },
        { id: 'n10', label: 'Pyruvate', type: 'metabolite', x: 200, y: 300, present: true },
    ],
    edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5' },
        { id: 'e5', source: 'n5', target: 'n6' },
        { id: 'e6', source: 'n6', target: 'n7' },
        { id: 'e7', source: 'n7', target: 'n8' },
        { id: 'e8', source: 'n8', target: 'n9' },
        { id: 'e9', source: 'n9', target: 'n10' },
    ]
};

const mockPhyloTree: PhylogeneticNode = {
    id: 'root',
    name: 'Bacteria',
    branchLength: 0.1,
    children: [
        {
            id: 'proteobacteria',
            name: 'Proteobacteria',
            branchLength: 0.2,
            children: [
                {
                    id: 'gamma',
                    name: 'Gammaproteobacteria',
                    branchLength: 0.15,
                    children: [
                        {
                            id: 'entero',
                            name: 'Enterobacteriaceae',
                            branchLength: 0.1,
                            children: [
                                {
                                    id: 'ecoli',
                                    name: 'Escherichia coli',
                                    scientificName: 'E. coli K-12',
                                    branchLength: 0.05,
                                    highlighted: true
                                },
                                {
                                    id: 'salmonella',
                                    name: 'Salmonella enterica',
                                    branchLength: 0.06
                                },
                                {
                                    id: 'klebsiella',
                                    name: 'Klebsiella pneumoniae',
                                    branchLength: 0.07
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

const mockAbundance: AbundanceData = {
    microbeId: 'ecoli',
    microbeName: 'E. coli K-12',
    averageAbundance: 12.5,
    samples: [
        { sampleId: 's1', sampleName: 'Sample A', abundance: 15000, percentage: 15.2, group: 'healthy' },
        { sampleId: 's2', sampleName: 'Sample B', abundance: 8000, percentage: 8.1, group: 'healthy' },
        { sampleId: 's3', sampleName: 'Sample C', abundance: 22000, percentage: 22.5, group: 'disease' },
        { sampleId: 's4', sampleName: 'Sample D', abundance: 18000, percentage: 18.3, group: 'disease' },
        { sampleId: 's5', sampleName: 'Sample E', abundance: 5000, percentage: 5.1, group: 'treatment' },
        { sampleId: 's6', sampleName: 'Sample F', abundance: 6500, percentage: 6.6, group: 'treatment' },
    ]
};

// ============================================
// Component
// ============================================

/**
 * MicrobialTraitPage - 微生物性状分析主页面
 */
export const MicrobialTraitPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('Escherichia coli');
    const [loading, setLoading] = useState(false);

    const [microbe, setMicrobe] = useState<Microbe | null>(mockMicrobe);
    const [traits] = useState<TraitGroup[]>(mockTraits);
    const [resistances] = useState<AntibioticResistance[]>(mockResistances);
    const [pathway] = useState<Pathway | null>(mockPathway);
    const [phyloTree] = useState<PhylogeneticNode | null>(mockPhyloTree);
    const [abundance] = useState<AbundanceData | null>(mockAbundance);

    // 处理搜索
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1200));

        // 保持模拟数据
        setMicrobe({ ...mockMicrobe, name: searchQuery, scientificName: searchQuery });
        setLoading(false);
    }, [searchQuery]);

    return (
        <div className="microbial-trait-page">
            {/* 页面头部 */}
            <PageHeader
                icon="🦠"
                title="微生物性状分析"
                subtitle="基因组驱动的表型特征推断平台"
            >
                <div className="microbial-trait-page__search">
                    <div className="microbial-trait-page__search-wrapper">
                        <Search size={20} className="microbial-trait-page__search-icon" />
                        <input
                            type="text"
                            placeholder="输入微生物名称或分类..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <button onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : '分析'}
                    </button>
                </div>
            </PageHeader>

            {/* 微生物信息卡 */}
            {microbe && (
                <div className="microbial-trait-page__info-card">
                    <div className="microbial-trait-page__info-main">
                        <h2>{microbe.name}</h2>
                        <p className="microbial-trait-page__scientific-name">{microbe.scientificName}</p>
                    </div>
                    <div className="microbial-trait-page__taxonomy">
                        {Object.entries(microbe.taxonomy).slice(0, 4).map(([rank, name]) => (
                            <span key={rank} className="microbial-trait-page__taxon">
                                <small>{rank}:</small> {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 主内容区 */}
            <div className="microbial-trait-page__content">
                {/* 左侧：代谢通路图 */}
                <div className="microbial-trait-page__pathway-section">
                    <PathwayMap pathway={pathway} loading={loading} />
                </div>

                {/* 右侧：性状和统计 */}
                <div className="microbial-trait-page__details-section">
                    {/* 性状卡片 */}
                    <TraitCards traits={traits} resistances={resistances} loading={loading} />

                    {/* 系统发育树 */}
                    <PhylogeneticTree data={phyloTree} loading={loading} />

                    {/* 丰度图 */}
                    <AbundanceChart data={abundance} loading={loading} />
                </div>
            </div>
        </div>
    );
};
