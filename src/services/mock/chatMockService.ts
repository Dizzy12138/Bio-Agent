import { type Expert } from '../../constants/experts';
import type { Message } from '../../types';

export async function mockChatAPI(
    content: string,
    expert: Expert | null
): Promise<Message> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock response
    return {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: generateMockResponse(content, expert),
        timestamp: new Date().toISOString(),
        expertId: expert?.id,
        expertName: expert?.name,
        expertAvatar: expert?.avatar,
        metadata: expert ? {
            toolCalls: generateToolCalls(expert),
            citations: generateCitations(expert),
        } : undefined,
    };
}

// Mock Response Logic
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

// Tool Calls
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

// Citations
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
