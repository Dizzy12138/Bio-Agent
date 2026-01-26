import React from 'react';
import { Sidebar } from './components/Sidebar';

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
import './styles/index.css';
import './App.css';

import { Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <div className="app" data-theme="light">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/experts" replace />} />
          <Route path="/experts" element={<ExpertManager />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/knowledge" element={<KnowledgeManager />} />
          <Route path="/bioextract" element={<BioExtractChat />} />
          <Route path="/playground" element={<PlaygroundLayout />} />
          <Route path="/query" element={<InteractiveQueryPage />} />
          <Route path="/literature" element={<LiteratureMiningPage />} />
          <Route path="/molecular" element={<MolecularAnalysisPage />} />
          <Route path="/microbial" element={<MicrobialTraitPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="*" element={<Navigate to="/experts" replace />} />
        </Routes>
      </main>
    </div>
  );
};




export default App;
