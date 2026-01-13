import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ExpertManager } from './features/experts';
import { ChatInterface } from './features/chat';
import { KnowledgeManager } from './features/knowledge';
import { BioExtractChat } from './features/bioextract';
import './styles/index.css';
import './App.css';

type ViewType = 'experts' | 'chat' | 'knowledge' | 'bioextract' | 'settings';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('experts');

  const renderContent = () => {
    switch (activeView) {
      case 'experts':
        return <ExpertManager />;
      case 'chat':
        return <ChatInterface />;
      case 'knowledge':
        return <KnowledgeManager />;
      case 'bioextract':
        return <BioExtractChat />;
      case 'settings':
        return <SettingsPlaceholder />;
      default:
        return <ExpertManager />;
    }
  };

  return (
    <div className="app" data-theme="light">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
};

// 设置占位组件
const SettingsPlaceholder: React.FC = () => (
  <div className="placeholder-view">
    <h2>系统设置</h2>
    <p>这里将配置：</p>
    <ul>
      <li>🤖 LLM模型配置与API密钥</li>
      <li>🔌 MCP协议工具注册</li>
      <li>🎨 界面主题与语言</li>
      <li>👥 用户权限管理</li>
    </ul>
  </div>
);

export default App;

