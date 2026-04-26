import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ChatAssessment from './pages/ChatAssessment';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh' }}>
        <header className="app-header">
          <div className="app-header-inner">
            <div className="logo-icon">C</div>
            <span className="logo-text">Catalyst Soul AI</span>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<ChatAssessment />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
