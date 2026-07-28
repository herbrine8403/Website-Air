import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import IndexPage from './IndexPage';
import TopicsPage from './TopicsPage';
import TopicDetailPage from './TopicDetailPage';
import ArticlesPage from './ArticlesPage';
import ArticleDetailPage from './ArticleDetailPage';
import QuestionsPage from './QuestionsPage';
import QuestionDetailPage from './QuestionDetailPage';
import NewPostPage from './NewPostPage';

export default function ForumApp() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Navbar forceActive="forum" />
          <div className="navbar-spacer" aria-hidden="true" />
          <main className="flex-1">
            <Routes>
              {/* 根路径重定向到 /forum（避免访问 /forum.html 时 hash 为空导致空白） */}
              <Route path="/" element={<Navigate to="/forum" replace />} />
              <Route path="/forum" element={<IndexPage />} />
              <Route path="/forum/topics" element={<TopicsPage />} />
              <Route path="/forum/topic" element={<TopicDetailPage />} />
              <Route path="/forum/articles" element={<ArticlesPage />} />
              <Route path="/forum/article" element={<ArticleDetailPage />} />
              <Route path="/forum/questions" element={<QuestionsPage />} />
              <Route path="/forum/question" element={<QuestionDetailPage />} />
              <Route path="/forum/new-post" element={<AuthGuard><NewPostPage /></AuthGuard>} />
              <Route path="*" element={<Navigate to="/forum" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}
