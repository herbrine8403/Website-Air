import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import IndexPage from './IndexPage';
import ListPage from './ListPage';
import DetailPage from './DetailPage';
import VersionsPage from './VersionsPage';
import VersionDetailPage from './VersionDetailPage';
import UploadPage from './UploadPage';
import SettingsPage from './SettingsPage';

export default function ResourcesApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Navbar forceActive="resources" />
          <div className="navbar-spacer" aria-hidden="true" />
          <main className="flex-1">
            <Routes>
              <Route path="/resources" element={<IndexPage />} />
              <Route path="/resources/list" element={<ListPage />} />
              <Route path="/resources/detail" element={<DetailPage />} />
              <Route path="/resources/versions" element={<VersionsPage />} />
              <Route path="/resources/version" element={<VersionDetailPage />} />
              <Route path="/resources/upload" element={<AuthGuard><UploadPage /></AuthGuard>} />
              <Route path="/resources/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
              <Route path="/resources/*" element={<Navigate to="/resources" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
