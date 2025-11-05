import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 共通レイアウト・コンポーネント（今後作成）
// import StudentLayout from '@components/common/StudentLayout';
// import TeacherLayout from '@components/common/TeacherLayout';
// import AdminLayout from '@components/common/AdminLayout';
// import AuthLayout from '@components/common/AuthLayout';

// --- ページコンポーネントのインポート ---
// (エイリアスパス @pages/... を使用)

// 共通ページ
import Landing from '@pages/common/Landing/Landing';
import Login from '@pages/common/Login/Login';
import Signup from '@pages/common/Signup/Signup';

// 生徒向けページ
import Home from '@pages/student/Home/Home';
import QuizDetail from '@pages/student/QuizDetail/QuizDetail';
import ContentCreate from '@pages/student/ContentCreate/ContentCreate';
import MyPage from '@pages/student/MyPage/MyPage';
import Report from '@pages/student/Report/Report';
import Search from '@pages/student/Search/Search';

// 教師向けページ
import Dashboard from '@pages/teacher/Dashboard/Dashboard';
import TeamManagement from '@pages/teacher/TeamManagement/TeamManagement';
import TeamDetail from '@pages/teacher/TeamDetail/TeamDetail';
import StudentDetail from '@pages/teacher/StudentDetail/StudentDetail';
import Correction from '@pages/teacher/Correction/Correction';
import Curriculum from '@pages/teacher/Curriculum/Curriculum';

// 管理者向けページ
import TeacherManagement from '@pages/admin/TeacherManagement/TeacherManagement';
import StudentUpload from '@pages/admin/StudentUpload/StudentUpload';
import ContentManagement from '@pages/admin/ContentManagement/ContentManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- 共通ルート ---
          TODO: 認証状態によってリダイレクトするロジック (AuthLayout) を追加
        */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* --- 生徒向けルート ---
          TODO: 生徒専用のレイアウト (StudentLayout) と認証ガードを追加
        */}
        <Route path="/home" element={<Home />} />
        <Route path="/quiz/:id" element={<QuizDetail />} />
        <Route path="/create" element={<ContentCreate />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/search" element={<Search />} />

        {/* --- 教師向けルート ---
          TODO: 教師専用のレイアウト (TeacherLayout) と認証ガードを追加
        */}
        <Route path="/teacher/dashboard" element={<Dashboard />} />
        <Route path="/teacher/teams" element={<TeamManagement />} />
        <Route path="/teacher/team/:id" element={<TeamDetail />} />
        <Route path="/teacher/student/:id" element={<StudentDetail />} />
        <Route path="/teacher/corrections" element={<Correction />} />
        <Route path="/teacher/curriculum" element={<Curriculum />} />

        {/* --- 管理者向けルート ---
          TODO: 管理者専用のレイAYアウト (AdminLayout) と認証ガードを追加
        */}
        <Route path="/admin/teachers" element={<TeacherManagement />} />
        <Route path="/admin/students/upload" element={<StudentUpload />} />
        <Route path="/admin/contents" element={<ContentManagement />} />

        {/* TODO: 404 Not Found ページ */}
        <Route path="*" element={<div>404 - ページが見つかりません</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

