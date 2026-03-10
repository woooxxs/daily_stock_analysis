import type React from 'react';
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AlertCircle, RefreshCcw, Sparkles } from 'lucide-react';
import { Shell } from './components/Shell';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';
import { Button, EmptyState, Loading } from './components/common';

const HomePage = lazy(() => import('./pages/HomePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const BacktestPage = lazy(() => import('./pages/BacktestPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StockHistoryPage = lazy(() => import('./pages/StockHistoryPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const AppContent: React.FC = () => {
  const location = useLocation();
  const { authEnabled, loggedIn, isLoading, loadError, refreshStatus } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="正在准备工作台"
            description="正在加载认证状态与系统配置，请稍候。"
            action={<Loading />}
          />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <EmptyState
            icon={<AlertCircle className="h-5 w-5" />}
            title="无法连接到后端服务"
            description={loadError}
            action={(
              <Button type="button" onClick={() => void refreshStatus()}>
                <RefreshCcw className="h-4 w-4" />
                重新检测服务
              </Button>
            )}
          />
        </div>
      </div>
    );
  }

  if (authEnabled && !loggedIn) {
    if (location.pathname === '/login') {
      return <LoginPage />;
    }

    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <Shell>
      <Suspense
        fallback={
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <Loading />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/backtest" element={<BacktestPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stocks/:stockCode" element={<StockHistoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Shell>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
