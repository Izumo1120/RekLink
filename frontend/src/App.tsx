import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ページコンポーネントのインポート
import Landing from '@pages/common/Landing/Landing';
import Login from '@pages/common/Login/Login';
import Signup from '@pages/common/Signup/Signup';
// import QuizFeed from '@pages/common/QuizFeed/QuizFeed';
import Home from '@pages/student/Home/Home';

// ★★★ 修正 ★★★
// 不足していたページのインポートを追加
import QuizDetail from '@pages/student/QuizDetail/QuizDetail';
import ContentCreate from '@pages/student/ContentCreate/ContentCreate';
import MyPage from '@pages/student/MyPage/MyPage';
import Report from '@pages/student/Report/Report';
import Search from '@pages/student/Search/Search';
import Dashboard from '@pages/teacher/Dashboard/Dashboard';
import TeamManagement from '@pages/teacher/TeamManagement/TeamManagement';
import TeamDetail from '@pages/teacher/TeamDetail/TeamDetail';
import StudentDetail from '@pages/teacher/StudentDetail/StudentDetail';
import Correction from '@pages/teacher/Correction/Correction';
import Curriculum from '@pages/teacher/Curriculum/Curriculum';
import TeacherManagement from '@pages/admin/TeacherManagement/TeacherManagement';
import StudentUpload from '@pages/admin/StudentUpload/StudentUpload';
import ContentManagement from '@pages/admin/ContentManagement/ContentManagement';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- 共通ルート --- */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* ログイン不要でアクセスできるクイズ一覧ページ */}
        {/* <Route path="/quizzes" element={<QuizFeed />} /> */}


        {/* --- ★★★ 修正 ★★★ (生徒向けルート) --- */}
        <Route path="/home" element={<Home />} />
        <Route path="/quiz/:id" element={<QuizDetail />} />

        {/* ★★★ 新規追加 (豆知識詳細) ★★★ */}
        <Route path="/trivia/:id" element={<QuizDetail />} />

        <Route path="/create" element={<ContentCreate />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/search" element={<Search />} />

        {/* --- ★★★ 修正 ★★★ (教師向けルート) --- */}
        <Route path="/teacher/dashboard" element={<Dashboard />} />
        <Route path="/teacher/teams" element={<TeamManagement />} />
        <Route path="/teacher/team/:id" element={<TeamDetail />} />
        <Route path="/teacher/student/:id" element={<StudentDetail />} />
        <Route path="/teacher/corrections" element={<Correction />} />
        <Route path="/teacher/curriculum" element={<Curriculum />} />

        {/* --- ★★★ 修正 ★★★ (管理者向けルート) --- */}
        <Route path="/admin/teachers" element={<TeacherManagement />} />
        <Route path="/admin/students/upload" element={<StudentUpload />} />
        <Route path="/admin/contents" element={<ContentManagement />} />

        {/* 404 Not Found ページ */}
        <Route path="*" element={<div>404 - ページが見つかりません</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;