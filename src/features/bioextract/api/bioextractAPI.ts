/**
 * BioExtract-AI Mock 数据 API
 * 模拟 ATPS 数据库和 Drug Delivery 标签库
 */

import type {
    ATPSRecord,
    PolymerCandidate,
    PolymerTag,
    Modifier,
    DrugDeliveryProfile,
    FilterCriteria,
    Recommendation,
    FunctionalTagType,
} from '../types';

// =============================================
// Mock ATPS 数据库 (示例数据)
// =============================================

export const MOCK_ATPS_RECORDS: ATPSRecord[] = [
    // PEG + Dextran 系列
    {
        id: 'atps-001',
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 6000,
        polymer2MW: 500000,
        polymer1Conc: 4.5,
        polymer2Conc: 7.0,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 3.2,
        reference: 'Albertsson, 1986',
        doi: '10.1016/xxx',
    },
    {
        id: 'atps-002',
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 8000,
        polymer2MW: 500000,
        polymer1Conc: 5.0,
        polymer2Conc: 6.5,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 4.1,
        reference: 'Walter et al., 1985',
    },
    {
        id: 'atps-003',
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 20000,
        polymer2MW: 500000,
        polymer1Conc: 4.0,
        polymer2Conc: 5.0,
        temperature: 25,
        pH: 7.4,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 5.8,
        reference: 'Zaslavsky, 1995',
    },
    // PVP + Dextran 系列
    {
        id: 'atps-101',
        polymer1: 'PVP',
        polymer2: 'Dextran',
        polymer1MW: 40000,
        polymer2MW: 500000,
        polymer1Conc: 8.0,
        polymer2Conc: 5.0,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'PVP',
        bottomPhase: 'Dextran',
        partitionCoefficient: 2.1,
        reference: 'Johansson et al., 1998',
    },
    // EOPO + Dextran 系列
    {
        id: 'atps-201',
        polymer1: 'EOPO',
        polymer2: 'Dextran',
        polymer1MW: 3900,
        polymer2MW: 500000,
        polymer1Conc: 6.0,
        polymer2Conc: 4.0,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'EOPO',
        bottomPhase: 'Dextran',
        partitionCoefficient: 2.8,
        reference: 'Persson et al., 1999',
    },
    // 更多 PEG + Dextran 记录 (模拟大量数据)
    ...Array.from({ length: 50 }, (_, i) => ({
        id: `atps-peg-${1000 + i}`,
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 4000 + Math.floor(Math.random() * 16000),
        polymer2MW: 500000,
        polymer1Conc: 3 + Math.random() * 5,
        polymer2Conc: 4 + Math.random() * 6,
        temperature: 25,
        pH: 6.5 + Math.random() * 1.5,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 2 + Math.random() * 5,
        reference: `Literature ${1000 + i}`,
    })),
];

// =============================================
// Mock Drug Delivery 标签库
// =============================================

export const MOCK_POLYMER_TAGS: PolymerTag[] = [
    // PEG 标签
    { polymerId: 'peg', polymerName: 'PEG', tag: 'pH_Stability', rating: 'excellent', conditions: 'pH 1-14 稳定' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Enzyme_Resistance', rating: 'moderate', mechanism: '空间位阻效应' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Biocompatibility', rating: 'excellent', mechanism: 'FDA 批准的生物相容性材料' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Mucoadhesion', rating: 'poor', mechanism: '缺乏粘附基团' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Controlled_Release', rating: 'moderate' },

    // PVP 标签
    { polymerId: 'pvp', polymerName: 'PVP', tag: 'pH_Stability', rating: 'good' },
    { polymerId: 'pvp', polymerName: 'PVP', tag: 'Biocompatibility', rating: 'good' },
    { polymerId: 'pvp', polymerName: 'PVP', tag: 'Mucoadhesion', rating: 'poor' },

    // Chitosan 标签
    { polymerId: 'chitosan', polymerName: 'Chitosan', tag: 'Mucoadhesion', rating: 'excellent', mechanism: '正电荷与粘膜负电荷结合' },
    { polymerId: 'chitosan', polymerName: 'Chitosan', tag: 'pH_Stability', rating: 'moderate', conditions: '酸性条件下溶解' },
    { polymerId: 'chitosan', polymerName: 'Chitosan', tag: 'Biodegradability', rating: 'excellent' },
];

export const MOCK_MODIFIERS: Modifier[] = [
    {
        id: 'mod-maa',
        name: 'MAA',
        fullName: 'Methacrylic Acid (甲基丙烯酸)',
        category: 'monomer',
        providedTags: ['pH_Stability', 'Controlled_Release', 'Site_Specific'],
        compatiblePolymers: ['PEG', 'PVP', 'HPMC'],
        mechanism: 'pH敏感性：酸性环境下收缩保护，碱性环境（肠道pH>7）溶胀释放',
        chemicalStructure: 'CH2=C(CH3)COOH',
        references: ['Lowman et al., 1999', 'Peppas et al., 2000'],
    },
    {
        id: 'mod-dopa',
        name: 'DOPA',
        fullName: 'L-3,4-dihydroxyphenylalanine (多巴/邻苯二酚)',
        category: 'functional_group',
        providedTags: ['Mucoadhesion', 'Site_Specific'],
        compatiblePolymers: ['PEG', 'PVP', 'Chitosan', 'Alginate'],
        mechanism: '仿贻贝粘附：邻苯二酚基团与组织蛋白形成共价键和氢键，提供强效湿态粘附',
        chemicalStructure: 'HO-C6H3(OH)-CH2-CH(NH2)-COOH',
        references: ['Lee et al., 2007', 'Waite et al., 2005'],
    },
    {
        id: 'mod-paa',
        name: 'PAA',
        fullName: 'Polyacrylic Acid (聚丙烯酸)',
        category: 'monomer',
        providedTags: ['pH_Stability', 'Mucoadhesion'],
        compatiblePolymers: ['PEG', 'PVP'],
        mechanism: 'pH响应性，羧基提供粘附位点',
        references: ['Khutoryanskiy et al., 2018'],
    },
    {
        id: 'mod-thiol',
        name: 'Thiol',
        fullName: 'Thiol Groups (巯基)',
        category: 'functional_group',
        providedTags: ['Mucoadhesion', 'Cell_Penetration'],
        compatiblePolymers: ['Chitosan', 'PEG', 'PAA'],
        mechanism: '与粘膜糖蛋白上的半胱氨酸残基形成二硫键',
        references: ['Bernkop-Schnürch et al., 2004'],
    },
];

// =============================================
// Mock API 服务
// =============================================

export const bioextractAPI = {
    /**
     * 根据内相聚合物筛选 ATPS 数据
     */
    async filterATPSByInnerPhase(innerPhase: string): Promise<{
        records: ATPSRecord[];
        candidates: PolymerCandidate[];
        totalRecords: number;
    }> {
        // Call backend API
        const response = await fetch(`http://localhost:8000/api/v1/bioextract/atps/filter?inner_phase=${encodeURIComponent(innerPhase)}`);
        if (!response.ok) {
            throw new Error('API call failed');
        }

        const data = await response.json();
        const matchedRecords: ATPSRecord[] = data.records;

        // Stats logic (keep frontend stats for now or move to backend completely)
        // For now, we process stats on frontend to keep compatibility with existing components
        const polymerStats = new Map<string, {
            count: number;
            records: ATPSRecord[];
            mws: number[];
        }>();

        matchedRecords.forEach(record => {
            const outerPhase = record.polymer1.toLowerCase() === innerPhase.toLowerCase()
                ? record.polymer2
                : record.polymer1;

            if (!polymerStats.has(outerPhase)) {
                polymerStats.set(outerPhase, { count: 0, records: [], mws: [] });
            }
            const stats = polymerStats.get(outerPhase)!;
            stats.count++;
            stats.records.push(record);
            stats.mws.push(record.polymer1MW);
        });

        const candidates: PolymerCandidate[] = Array.from(polymerStats.entries())
            .map(([name, stats]) => ({
                name,
                fullName: getFullPolymerName(name),
                matchCount: stats.count,
                coverageRate: Math.round((stats.count / matchedRecords.length) * 100),
                avgPartitionCoeff: stats.records.reduce((sum, r) => sum + (r.partitionCoefficient || 0), 0) / stats.count,
                mwRange: [Math.min(...stats.mws), Math.max(...stats.mws)] as [number, number],
                compatibleWith: [innerPhase],
                sourceRecordIds: stats.records.map(r => r.id),
            }))
            .sort((a, b) => b.coverageRate - a.coverageRate);

        return {
            records: matchedRecords,
            candidates,
            totalRecords: data.totalRecords || matchedRecords.length,
        };
    },

    /**
     * 获取聚合物的功能标签
     */
    async getPolymerTags(polymerName: string): Promise<DrugDeliveryProfile> {
        await new Promise(resolve => setTimeout(resolve, 500));

        const tags = MOCK_POLYMER_TAGS.filter(
            t => t.polymerName.toLowerCase() === polymerName.toLowerCase()
        );

        const weaknesses: string[] = [];
        const strengths: string[] = [];

        tags.forEach(tag => {
            if (tag.rating === 'poor' || tag.rating === 'none') {
                weaknesses.push(`${getTagDisplayName(tag.tag)}: ${tag.rating}`);
            } else if (tag.rating === 'excellent' || tag.rating === 'good') {
                strengths.push(`${getTagDisplayName(tag.tag)}: ${tag.rating}`);
            }
        });

        // 查找建议的改性方案
        const missingTags = ['Mucoadhesion', 'Site_Specific'].filter(
            t => !tags.find(tag => tag.tag === t && (tag.rating === 'excellent' || tag.rating === 'good'))
        ) as FunctionalTagType[];

        const suggestedModifiers = MOCK_MODIFIERS.filter(mod =>
            mod.compatiblePolymers.includes(polymerName.toUpperCase()) &&
            mod.providedTags.some(t => missingTags.includes(t))
        );

        return {
            polymerId: polymerName.toLowerCase(),
            polymerName,
            tags,
            modifiers: suggestedModifiers,
            overallScore: calculateOverallScore(tags),
            strengths,
            weaknesses,
            suggestedModifications: suggestedModifiers,
        };
    },

    /**
     * 搜索能提供特定功能标签的改性单体
     */
    async searchModifiers(requiredTags: FunctionalTagType[], compatibleWith?: string): Promise<Modifier[]> {
        await new Promise(resolve => setTimeout(resolve, 400));

        return MOCK_MODIFIERS.filter(mod => {
            const hasRequiredTag = requiredTags.some(tag => mod.providedTags.includes(tag));
            const isCompatible = !compatibleWith || mod.compatiblePolymers.includes(compatibleWith.toUpperCase());
            return hasRequiredTag && isCompatible;
        });
    },

    /**
     * 生成最终推荐方案
     */
    async generateRecommendation(
        backbone: string,
        modifiers: string[],
        criteria: FilterCriteria
    ): Promise<Recommendation> {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const formula = [backbone, ...modifiers].join('-');

        return {
            id: `rec-${Date.now()}`,
            polymerFormula: formula,
            components: {
                backbone,
                modifiers,
            },
            satisfiedCriteria: criteria.requiredTags.map(tag => ({
                tag,
                rating: 'excellent' as const,
                explanation: getTagExplanation(tag, backbone, modifiers),
            })),
            mechanismExplanation: generateMechanismExplanation(backbone, modifiers, criteria),
            confidence: 92,
            supportingLiterature: [
                {
                    title: 'Mussel-Inspired Adhesives and Coatings',
                    authors: ['Lee, H.', 'Lee, B. P.', 'Messersmith, P. B.'],
                    journal: 'Annual Review of Materials Research',
                    year: 2011,
                    doi: '10.1146/annurev-matsci-062910-100429',
                    relevanceScore: 98,
                },
                {
                    title: 'pH-Responsive Polymers for Drug Delivery',
                    authors: ['Lowman, A. M.', 'Peppas, N. A.'],
                    journal: 'Advanced Drug Delivery Reviews',
                    year: 1999,
                    doi: '10.1016/S0169-409X(99)00047-9',
                    relevanceScore: 95,
                },
                {
                    title: 'Aqueous Two-Phase Systems for Biotechnology',
                    authors: ['Albertsson, P. A.'],
                    journal: 'Partitioning in Aqueous Two-Phase Systems',
                    year: 1986,
                    doi: '10.1016/B978-0-12-049350-6.X5001-4',
                    relevanceScore: 91,
                },
            ],
            atpsSourceIds: ['atps-001', 'atps-002', 'atps-003'],
        };
    },
};

// =============================================
// 辅助函数
// =============================================

function getFullPolymerName(abbr: string): string {
    const names: Record<string, string> = {
        'PEG': 'Polyethylene glycol (聚乙二醇)',
        'PVP': 'Polyvinylpyrrolidone (聚乙烯吡咯烷酮)',
        'EOPO': 'Ethylene oxide-propylene oxide (环氧乙烷-环氧丙烷共聚物)',
        'Dextran': 'Dextran (葡聚糖)',
    };
    return names[abbr] || abbr;
}

function getTagDisplayName(tag: FunctionalTagType): string {
    const names: Record<FunctionalTagType, string> = {
        'pH_Stability': '抗胃酸 (pH稳定性)',
        'Enzyme_Resistance': '抗酶性',
        'Mucoadhesion': '粘膜粘附',
        'Site_Specific': '定点释放',
        'Biocompatibility': '生物相容性',
        'Biodegradability': '生物降解性',
        'Controlled_Release': '控释性能',
        'Cell_Penetration': '细胞穿透',
        'Targeting': '靶向性',
    };
    return names[tag] || tag;
}

function calculateOverallScore(tags: PolymerTag[]): number {
    const weights: Record<string, number> = {
        'excellent': 100,
        'good': 75,
        'moderate': 50,
        'poor': 25,
        'none': 0,
    };
    if (tags.length === 0) return 0;
    return Math.round(tags.reduce((sum, t) => sum + (weights[t.rating] || 0), 0) / tags.length);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getTagExplanation(tag: FunctionalTagType, backbone: string, _modifiers: string[]): string {
    const explanations: Record<FunctionalTagType, string> = {
        'pH_Stability': `${backbone} 链段在酸性环境稳定；MAA 在 pH<5 时塌缩形成保护层`,
        'Enzyme_Resistance': `${backbone} 链提供空间位阻，阻挡胃蛋白酶接近`,
        'Mucoadhesion': `DOPA 邻苯二酚基团与肠道黏膜蛋白形成共价交联`,
        'Site_Specific': `MAA 在肠道 pH>7 环境下去质子化，触发溶胀释放`,
        'Biocompatibility': `${backbone} 为 FDA 批准的生物相容性材料`,
        'Biodegradability': '可被生物降解',
        'Controlled_Release': '具有控释能力',
        'Cell_Penetration': '具有细胞穿透能力',
        'Targeting': '具有靶向性',
    };
    return explanations[tag] || '满足要求';
}

function generateMechanismExplanation(backbone: string, modifiers: string[], criteria: FilterCriteria): string {
    return `**推荐配方**: ${backbone}-${modifiers.join('-')}

**作用机制**:
1. **相分离能力**: ${backbone} 链段保证与 ${criteria.innerPhase} 形成稳定的双水相系统 (ATPS)。
2. **抗胃酸/抗酶保护**: MAA 在胃部酸性环境 (pH 1-3) 下质子化收缩，形成致密保护层；${backbone} 链提供空间位阻阻挡蛋白酶。
3. **肠道定殖**: DOPA 邻苯二酚基团通过氢键和共价交联牢固锚定于肠道受损黏膜。
4. **定点释放**: 进入肠道 (pH > 7) 后，MAA 去质子化导致聚合物网络溶胀，释放 ${criteria.innerPhase} 相中的益生菌。`;
}

export default bioextractAPI;
