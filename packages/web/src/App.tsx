import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Login } from './pages/Login';
import { Projects } from './pages/Projects';
import { Project } from './pages/Project';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<Project />} />
          <Route path="/" element={<Projects />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
