import React, { useState, useCallback } from 'react';
import { MoleculeViewer, RadarChart, ADMETHeatmap, StructureEditor } from './components';
import { PageHeader } from '../../components/PageHeader';
import type { Molecule, LipinskiRule, ADMETProperties } from './types';
import './MolecularAnalysisPage.css';

// ============================================
// Mock Data - 模拟数据
// ============================================

const mockMolecule: Molecule = {
    id: 'aspirin',
    name: 'Aspirin (阿司匹林)',
    smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
    formula: 'C₉H₈O₄',
    description: '一种常用的非甾体抗炎药物'
};

const mockLipinski: LipinskiRule = {
    molecularWeight: 180.16,
    logP: 1.19,
    hBondDonors: 1,
    hBondAcceptors: 4,
    rotatableBonds: 3,
    tpsa: 63.6
};

const mockADMET: ADMETProperties = {
    absorption: [
        { name: 'Caco-2 渗透性', value: 22.5, unit: 'nm/s', risk: 'low', description: '良好的肠道吸收' },
        { name: 'HIA (人体肠道吸收)', value: 93.2, unit: '%', risk: 'low' },
        { name: 'P-gp 底物', value: 'No', risk: 'low' },
    ],
    distribution: [
        { name: 'VDss', value: 0.15, unit: 'L/kg', risk: 'low' },
        { name: '血脑屏障穿透', value: 'Low', risk: 'low', description: '难以穿过血脑屏障' },
        { name: '血浆蛋白结合率', value: 85.2, unit: '%', risk: 'medium' },
    ],
    metabolism: [
        { name: 'CYP2D6 抑制剂', value: 'No', risk: 'low' },
        { name: 'CYP3A4 底物', value: 'No', risk: 'low' },
        { name: 'CYP2C9 抑制剂', value: 'Yes', risk: 'medium', description: '可能影响华法林代谢' },
    ],
    excretion: [
        { name: '血浆半衰期', value: 3.1, unit: 'h', risk: 'low' },
        { name: '清除率', value: 8.2, unit: 'mL/min/kg', risk: 'low' },
    ],
    toxicity: [
        { name: '肝毒性', value: 'Low', risk: 'low' },
        { name: 'hERG 抑制', value: 'No', risk: 'low' },
        { name: '致突变性 (Ames)', value: 'Negative', risk: 'low' },
        { name: '皮肤过敏', value: 'Low', risk: 'low' },
    ],
    overallScore: 82,
    druglikeness: 'Good'
};

// ============================================
// Component
// ============================================

/**
 * MolecularAnalysisPage - 分子性质分析主页面
 * 
 * 提供分子结构输入、可视化和成药性预测
 */
export const MolecularAnalysisPage: React.FC = () => {
    const [smiles, setSmiles] = useState('CC(=O)OC1=CC=CC=C1C(=O)O');
    const [loading, setLoading] = useState(false);

    const [molecule, setMolecule] = useState<Molecule | null>(mockMolecule);
    const [lipinski, setLipinski] = useState<LipinskiRule | null>(mockLipinski);
    const [admet, setAdmet] = useState<ADMETProperties | null>(mockADMET);

    // 执行分析
    const handleAnalyze = useCallback(async () => {
        setLoading(true);

        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 根据 SMILES 生成模拟数据
        const formulaMatch = smiles.match(/C(\d*)/g);
        const carbonCount = formulaMatch
            ? formulaMatch.reduce((sum, m) => sum + (parseInt(m.slice(1)) || 1), 0)
            : 6;

        setMolecule({
            id: 'custom',
            name: '自定义分子',
            smiles: smiles,
            formula: `C${carbonCount}H${Math.floor(carbonCount * 1.5)}O${Math.floor(carbonCount / 3)}`,
        });

        setLipinski({
            molecularWeight: 100 + carbonCount * 12,
            logP: 0.5 + Math.random() * 4,
            hBondDonors: Math.floor(Math.random() * 5),
            hBondAcceptors: Math.floor(Math.random() * 8),
            rotatableBonds: Math.floor(Math.random() * 8),
            tpsa: 30 + Math.random() * 100
        });

        setAdmet(mockADMET);
        setLoading(false);
    }, [smiles]);

    return (
        <div className="molecular-analysis-page">
            {/* 页面头部 */}
            <PageHeader
                icon="🧬"
                title="分子性质分析"
                subtitle="药物筛选与成药性预测平台"
            />

            {/* 主内容区 */}
            <div className="molecular-analysis-page__content">
                {/* 左侧：分子可视化 */}
                <div className="molecular-analysis-page__viewer-section">
                    <MoleculeViewer molecule={molecule} loading={loading} />
                </div>

                {/* 右侧：输入和分析结果 */}
                <div className="molecular-analysis-page__analysis-section">
                    {/* 结构编辑器 */}
                    <StructureEditor
                        value={smiles}
                        onChange={setSmiles}
                        onAnalyze={handleAnalyze}
                        loading={loading}
                    />

                    {/* 里宾斯基雷达图 */}
                    <RadarChart data={lipinski} loading={loading} />

                    {/* ADMET 热力图 */}
                    <ADMETHeatmap data={admet} loading={loading} />
                </div>
            </div>
        </div>
    );
};
