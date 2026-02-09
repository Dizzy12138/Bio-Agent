/**
 * 知识图谱页面
 * 对接 Neo4j 数据库，展示和查询知识图谱
 */

import React, { useState, useEffect } from 'react';
import { Search, Database, Network, Zap, RefreshCw } from 'lucide-react';
import './KnowledgeGraphPage.css';

interface GraphNode {
    id: string;
    label: string;
    type: string;
    properties: Record<string, any>;
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: string;
    properties: Record<string, any>;
}

interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

interface Neo4jConfigInfo {
    source: 'local' | 'mcp';
    uri: string;
    username: string;
}

export const KnowledgeGraphPage: React.FC = () => {
    const [query, setQuery] = useState('MATCH (n) RETURN n LIMIT 50');
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [currentConfig, setCurrentConfig] = useState<Neo4jConfigInfo | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 检查Neo4j连接状态和当前配置
    useEffect(() => {
        checkConnection();
        fetchCurrentConfig();
    }, []);

    const fetchCurrentConfig = async () => {
        try {
            const res = await fetch('/api/v1/neo4j/config/current');
            if (res.ok) {
                const data = await res.json();
                setCurrentConfig(data);
            }
        } catch (e) {
            console.error('Failed to fetch Neo4j config:', e);
        }
    };

    const checkConnection = async () => {
        try {
            const res = await fetch('/api/v1/neo4j/status');
            if (res.ok) {
                const data = await res.json();
                setConnected(data.connected);
            }
        } catch (e) {
            console.error('Failed to check Neo4j connection:', e);
            setConnected(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // 执行Cypher查询
    const executeQuery = async () => {
        if (!query.trim()) {
            showMessage('error', '请输入查询语句');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/v1/neo4j/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() })
            });

            if (!res.ok) {
                throw new Error('查询失败');
            }

            const data = await res.json();
            setGraphData(data);
            
            if (data.nodes.length === 0 && data.edges.length === 0) {
                showMessage('error', '查询结果为空');
            } else {
                showMessage('success', `查询成功: ${data.nodes.length} 个节点, ${data.edges.length} 条关系`);
            }
        } catch (e) {
            showMessage('error', e instanceof Error ? e.message : '查询失败');
        } finally {
            setLoading(false);
        }
    };

    // 预设查询示例
    const exampleQueries = [
        {
            label: '查询所有节点',
            query: 'MATCH (n) RETURN n LIMIT 50'
        },
        {
            label: '查询节点关系',
            query: 'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 30'
        },
        {
            label: '查询特定类型',
            query: 'MATCH (n:Material) RETURN n LIMIT 50'
        }
    ];

    return (
        <div className="kg-page">
            {/* 消息提示 */}
            {message && (
                <div className={`kg-message kg-message--${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* 头部 */}
            <header className="kg-header">
                <div className="kg-header-left">
                    <div className="kg-title">
                        <Network size={28} />
                        <h1>知识图谱</h1>
                    </div>
                    {currentConfig && (
                        <div className="kg-config-info">
                            <span className="kg-config-uri">{currentConfig.uri}</span>
                        </div>
                    )}
                </div>
                <div className="kg-header-actions">
                    <button
                        className="kg-btn kg-btn--secondary"
                        onClick={() => {
                            checkConnection();
                            fetchCurrentConfig();
                        }}
                    >
                        <RefreshCw size={16} />
                        刷新
                    </button>
                </div>
            </header>

            <div className="kg-content">
                {/* 左侧：查询面板 */}
                <aside className="kg-sidebar">
                    <div className="kg-panel">
                        <h3 className="kg-panel-title">
                            <Search size={18} />
                            Cypher 查询
                        </h3>

                        <div className="kg-query-input">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="输入 Cypher 查询语句..."
                                rows={6}
                                className="kg-textarea"
                            />
                            <button
                                onClick={executeQuery}
                                disabled={loading || !connected}
                                className="kg-btn kg-btn--primary"
                            >
                                <Zap size={16} />
                                {loading ? '查询中...' : '执行查询'}
                            </button>
                        </div>

                        <div className="kg-examples">
                            <h4>查询示例</h4>
                            {exampleQueries.map((example, i) => (
                                <button
                                    key={i}
                                    className="kg-example-btn"
                                    onClick={() => setQuery(example.query)}
                                >
                                    {example.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* 右侧：结果展示 */}
                <main className="kg-main">
                    <div className="kg-result-container">
                        {!connected ? (
                            <div className="kg-empty-state">
                                <Database size={64} className="kg-empty-icon" />
                                <h3>Neo4j 未连接</h3>
                                <p>请检查 Neo4j 配置</p>
                            </div>
                        ) : graphData.nodes.length === 0 ? (
                            <div className="kg-empty-state">
                                <Network size={64} className="kg-empty-icon" />
                                <h3>暂无数据</h3>
                                <p>执行查询以加载知识图谱数据</p>
                                {currentConfig && (
                                    <p className="kg-empty-hint">
                                        当前连接: {currentConfig.uri}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="kg-result">
                                <div className="kg-result-header">
                                    <div className="kg-result-stats">
                                        <span>节点: {graphData.nodes.length}</span>
                                        <span>关系: {graphData.edges.length}</span>
                                    </div>
                                </div>
                                <div className="kg-result-content">
                                    <div className="kg-nodes">
                                        <h4>节点列表</h4>
                                        {graphData.nodes.map(node => (
                                            <div key={node.id} className="kg-node-item">
                                                <div className="kg-node-header">
                                                    <span className="kg-node-type">{node.type}</span>
                                                    <span className="kg-node-label">{node.label}</span>
                                                </div>
                                                {Object.keys(node.properties).length > 0 && (
                                                    <div className="kg-node-properties">
                                                        {Object.entries(node.properties).slice(0, 3).map(([key, value]) => (
                                                            <div key={key} className="kg-property">
                                                                <span className="kg-property-key">{key}:</span>
                                                                <span className="kg-property-value">
                                                                    {String(value).substring(0, 50)}
                                                                    {String(value).length > 50 ? '...' : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default KnowledgeGraphPage;
