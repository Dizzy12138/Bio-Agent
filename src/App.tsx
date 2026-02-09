import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { LoginPage, RegisterPage } from './features/auth';
import { ExpertManager } from './features/experts';
import { ChatInterface } from './features/chat';
import { KnowledgeManager } from './features/knowledge';
import { BioExtractChat } from './features/bioextract';
import { PlaygroundLayout } from './features/playground';
import { InteractiveQueryPage } from './features/query';
import { LiteratureMiningPage } from './features/literature';
import { MolecularAnalysisPage } from './features/molecular';
import { MicrobialTraitPage } from './features/microbial';
import { SettingsPage } from './features/settings';
import { SkillsPage } from './features/skills';
import { KnowledgeGraphPage } from './features/knowledge-graph';
import { authAPI } from './utils/api';
import './styles/index.css';
import './App.css';

// 路由守卫组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authAPI.isAuthenticated();

  if (!isAuthenticated) {
    // 未登录，重定向到登录页，并保存当前路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// 带侧边栏的布局
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app" data-theme="light">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const isAuthenticated = authAPI.isAuthenticated();

  return (
    <Routes>
      {/* 根路径 - 根据登录状态重定向 */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? 
            <Navigate to="/experts" replace /> : 
            <Navigate to="/login" replace />
        } 
      />

      {/* 公开路由 - 登录注册 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 受保护的路由 - 需要登录 */}
      <Route path="/experts" element={<ProtectedRoute><MainLayout><ExpertManager /></MainLayout></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><MainLayout><ChatInterface /></MainLayout></ProtectedRoute>} />
      <Route path="/knowledge" element={<ProtectedRoute><MainLayout><KnowledgeManager /></MainLayout></ProtectedRoute>} />
      <Route path="/bioextract" element={<ProtectedRoute><MainLayout><BioExtractChat /></MainLayout></ProtectedRoute>} />
      <Route path="/playground" element={<ProtectedRoute><MainLayout><PlaygroundLayout /></MainLayout></ProtectedRoute>} />
      <Route path="/query" element={<ProtectedRoute><MainLayout><InteractiveQueryPage /></MainLayout></ProtectedRoute>} />
      <Route path="/literature" element={<ProtectedRoute><MainLayout><LiteratureMiningPage /></MainLayout></ProtectedRoute>} />
      <Route path="/molecular" element={<ProtectedRoute><MainLayout><MolecularAnalysisPage /></MainLayout></ProtectedRoute>} />
      <Route path="/microbial" element={<ProtectedRoute><MainLayout><MicrobialTraitPage /></MainLayout></ProtectedRoute>} />
      <Route path="/knowledge-graph" element={<ProtectedRoute><MainLayout><KnowledgeGraphPage /></MainLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/skills" element={<ProtectedRoute><MainLayout><SkillsPage /></MainLayout></ProtectedRoute>} />
      
      {/* 404 - 重定向到登录或首页 */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? 
            <Navigate to="/experts" replace /> : 
            <Navigate to="/login" replace />
        } 
      />
    </Routes>
  );
};

export default App;
