import React from 'react';
import { Table, BarChart3, FlaskConical, FileText } from 'lucide-react';
import type { GenerativeUIPayload } from '../../types';
import './GenerativeUIRenderer.css';

interface GenerativeUIRendererProps {
    payload: GenerativeUIPayload;
}

export const GenerativeUIRenderer: React.FC<GenerativeUIRendererProps> = ({ payload }) => {
    switch (payload.type) {
        case 'table':
        case 'comparison':
            return <ComparisonTable data={payload.data as TableData} />;
        case 'chart':
            return <ChartPlaceholder data={payload.data} />;
        case 'card':
            return <MaterialCard data={payload.data as MaterialCardData} />;
        case 'experiment':
            return <ExperimentCard data={payload.data as ExperimentData} />;
        default:
            return null;
    }
};

// 表格数据类型
interface TableData {
    headers: string[];
    rows: string[][];
    title?: string;
}

// 材料对比表格
const ComparisonTable: React.FC<{ data: TableData }> = ({ data }) => {
    return (
        <div className="generative-ui comparison-table">
            <div className="ui-header">
                <Table size={16} />
                <span>材料对比分析</span>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            {data.headers.map((header, i) => (
                                <th key={i}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} className={j === 0 ? 'material-name' : ''}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="ui-actions">
                <button className="ui-action-btn">导出CSV</button>
                <button className="ui-action-btn primary">生成实验方案</button>
            </div>
        </div>
    );
};

// 图表占位符（实际项目可集成ECharts或Recharts）
const ChartPlaceholder: React.FC<{ data: unknown }> = () => {
    return (
        <div className="generative-ui chart-placeholder">
            <div className="ui-header">
                <BarChart3 size={16} />
                <span>数据可视化</span>
            </div>
            <div className="chart-container">
                <div className="chart-mock">
                    <BarChart3 size={48} />
                    <p>图表渲染区域</p>
                    <span>可集成 ECharts / Recharts 进行数据可视化</span>
                </div>
            </div>
        </div>
    );
};

// 材料卡片数据类型
interface MaterialCardData {
    name: string;
    type: string;
    properties: Record<string, string | number>;
    applications: string[];
}

// 材料卡片
const MaterialCard: React.FC<{ data: MaterialCardData }> = ({ data }) => {
    return (
        <div className="generative-ui material-card">
            <div className="ui-header">
                <FlaskConical size={16} />
                <span>材料详情</span>
            </div>
            <div className="card-content">
                <h4>{data.name}</h4>
                <span className="material-type">{data.type}</span>
                <div className="properties-grid">
                    {Object.entries(data.properties).map(([key, value]) => (
                        <div key={key} className="property-item">
                            <span className="property-label">{key}</span>
                            <span className="property-value">{value}</span>
                        </div>
                    ))}
                </div>
                {data.applications && (
                    <div className="applications">
                        <span className="applications-label">应用场景：</span>
                        {data.applications.map((app, i) => (
                            <span key={i} className="application-tag">{app}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// 实验数据类型
interface ExperimentData {
    title: string;
    materials: string[];
    steps: string[];
    expectedOutcome: string;
}

// 实验方案卡片
const ExperimentCard: React.FC<{ data: ExperimentData }> = ({ data }) => {
    return (
        <div className="generative-ui experiment-card">
            <div className="ui-header">
                <FileText size={16} />
                <span>实验方案</span>
            </div>
            <div className="card-content">
                <h4>{data.title}</h4>

                <div className="experiment-section">
                    <h5>所需材料</h5>
                    <ul>
                        {data.materials.map((material, i) => (
                            <li key={i}>{material}</li>
                        ))}
                    </ul>
                </div>

                <div className="experiment-section">
                    <h5>实验步骤</h5>
                    <ol>
                        {data.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                </div>

                <div className="expected-outcome">
                    <strong>预期结果：</strong> {data.expectedOutcome}
                </div>
            </div>
            <div className="ui-actions">
                <button className="ui-action-btn">下载PDF</button>
                <button className="ui-action-btn primary">添加到实验队列</button>
            </div>
        </div>
    );
};
