import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Layout from './components/Layout';
import RecipeLibrary from './pages/RecipeLibrary';
import DailyPlanning from './pages/DailyPlanning';
import WeeklyPlanning from './pages/WeeklyPlanning';
import CleaningTasks from './pages/CleaningTasks';
import Settings from './pages/Settings';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './lib/AuthContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RecipeLibrary />} />
        <Route path="/daily" element={<DailyPlanning />} />
        <Route path="/weekly" element={<WeeklyPlanning />} />
        <Route path="/cleaning" element={<CleaningTasks />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
