import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Projects } from './pages/Projects';
import { Project } from './pages/Project';
import { ChatReview } from './pages/ChatReview';
import HomeGate from './routes/HomeGate';
import { GlobalDock } from './global/GlobalDock';
import { AppLayout } from "./app-shell/AppLayout";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AppLayout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
              <Route path="/project/:id" element={
                <ProtectedRoute>
                  <Project />
                </ProtectedRoute>
              } />
              <Route path="/chat-review" element={
                <ProtectedRoute>
                  <ChatReview />
                </ProtectedRoute>
              } />
              <Route path="/home" element={<HomeGate />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
            </Routes>
            </AppLayout>
            <GlobalDock />
          </Router>
          {/* React Hot Toast Toaster */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10b981',
                },
              },
              error: {
                duration: 6000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
