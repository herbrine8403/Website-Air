import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import SignInPage from './SignInPage';
import SignUpPage from './SignUpPage';
import VerifyEmailPage from './VerifyEmailPage';
import ResetPasswordPage from './ResetPasswordPage';
import DashboardPage from './DashboardPage';
import SettingsPage from './SettingsPage';
import ProfilePage from './ProfilePage';
import NotificationsPage from './NotificationsPage';
import AdminPage from './AdminPage';

export default function AccountApp() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Navbar forceActive="account" />
          <div className="navbar-spacer" aria-hidden="true" />
          <main className="flex-1">
            <Routes>
              {/* 根路径重定向到 /account/sign-in（避免访问 /account.html 时 hash 为空导致空白） */}
              <Route path="/" element={<Navigate to="/account/sign-in" replace />} />
              <Route path="/account/sign-in" element={<SignInPage />} />
              <Route path="/account/sign-up" element={<SignUpPage />} />
              <Route path="/account/verify-email" element={<VerifyEmailPage />} />
              <Route path="/account/reset-password" element={<ResetPasswordPage />} />
              <Route path="/account/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
              <Route path="/account/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
              <Route path="/account/profile/:username" element={<ProfilePage />} />
              <Route path="/account/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
              <Route path="/account/admin" element={<AuthGuard><AdminPage /></AuthGuard>} />
              <Route path="/account" element={<Navigate to="/account/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/account/sign-in" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}
