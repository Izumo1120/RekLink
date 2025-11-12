// このファイルは src/pages/teacher/StudentDetail/ フォルダに配置してください。
"use client";

import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import styles from './StudentDetail.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { getStudentDetails } from '@lib/api'; // ★ 新しいAPI関数

// --- アイコンのアセット ---
import logoBook from '@assets/icons/note-1.png';
import iconDashboard from '@assets/icons/icon-dashboard-inactive.png';
import iconTeam from '@assets/icons/people-1.png';
import iconFlag from '@assets/icons/achieve-2.png';
import iconLogout from '@assets/icons/icon-logout.png';
import iconArrowLeft from '@assets/icons/icon-arrow-left.png';
import iconPosts from '@assets/icons/note-1.png';
import iconAnalytics from '@assets/icons/graph-1.png';
import iconQuiz from '@assets/icons/note-1.png'; // クイズアイコン
import iconTrivia from '@assets/icons/people-1.png'; // 豆知識アイコン (仮)

const StudentDetail = () => {
  const navigate = useNavigate();
  const { id: studentId } = useParams(); // URLから生徒IDを取得

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentDetails | null>(null);

  // --- 認証ガード & 初期データ取得 ---
  useEffect(() => {
    // 1. 認証ガード
    if (!isAuthenticated || !token || !user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'teacher' && user.role !== 'admin') {
      navigate('/home');
      return;
    }
    if (!studentId) {
      setError('生徒IDが見つかりません。');
      setStatus('error');
      return;
    }

    // 2. データ取得ロジック
    const fetchData = async () => {
      try {
        setStatus('loading');
        const data = await getStudentDetails(token, studentId);
        setStudentData(data);
        setStatus('ready');
      } catch (err: any) {
        setError(err.message || '生徒情報の読み込みに失敗しました。');
        setStatus('error');
      }
    };
    fetchData();
  }, [isAuthenticated, user, token, navigate, studentId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- イニシャル取得ヘルパー ---
  const getInitials = (name: string | null) => {
    if (!name) return '？';
    const names = name.trim().split(/[\s,]+/);
    if (names.length >= 2) {
      return (names[0][0] || '') + (names[1][0] || '');
    }
    return name.substring(0, 2).toUpperCase();
  };

  // --- 日付フォーマットヘルパー ---
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>生徒情報を読み込み中...</div>;
  }

  if (status === 'error' || !studentData) {
    return <div className={styles.loadingScreen}>エラー: {error || '生徒データが見つかりません'}</div>;
  }

  const { profile, stats, recent_posts, recent_answers } = studentData;

  return (
    <div className={styles.layout}>

      {/* --- ヘッダー（PC・タブレット用） --- */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src={logoBook} alt="RekLink Logo" />
          <h1>RekLink Learning</h1>
        </div>
        <div className={styles.headerNav}>
          <Link to="/teacher/dashboard" className={styles.navButton}>
            <img src={iconDashboard} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>ダッシュボード</span>
          </Link>
          <Link to="/teacher/teams" className={styles.navButtonActive}>
            <img src={iconTeam} alt="" className={styles.navIcon} />
            <span>チーム管理</span>
          </Link>
          <Link to="/teacher/corrections" className={styles.navButton}>
            <img src={iconFlag} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>指摘管理</span>
          </Link>
          <button onClick={handleLogout} className={styles.navButton}>
            <img src={iconLogout} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>ログアウト</span>
          </button>
        </div>
      </header>

      {/* --- メインコンテンツ --- */}
      <main className={styles.mainContainer}>

        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>
            <button onClick={() => navigate(-1)} className={styles.backButton}>
              <img src={iconArrowLeft} alt="戻る" className={styles.backButtonIcon} />
              <span>メンバー一覧に戻る</span>
            </button>

            <div className={styles.studentProfileHeader}>
              <div className={styles.studentInitial}>
                {getInitials(profile.nickname)}
              </div>
              <div className={styles.studentInfo}>
                <span className={styles.studentName}>{profile.nickname}</span>
                <span className={styles.studentEmail}>{profile.email}</span>
              </div>
              {/* <span className={`${styles.statusBadge} ${styles.statusActive}`}>アクティブ</span> */}
            </div>

          </div>
        </div>

        {/* --- 4つのサマリーカード --- */}
        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={iconPosts} alt="総投稿数" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{stats.posts_created}</span>
              <label>総投稿数</label>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.iconGreen}><path d="M4 19V6.2C4 5.0799 4 4.51984 4.21799 4.09202C4.40973 3.71569 4.71569 3.40973 5.09202 3.21799C5.51984 3 6.0799 3 7.2 3H16.8C17.9201 3 18.4802 3 18.908 3.21799C19.2843 3.40973 19.5903 3.71569 19.782 4.09202C20 4.51984 20 5.0799 20 6.2V17H6C4.89543 17 4 17.8954 4 19ZM4 19C4 20.1046 4.89543 21 6 21H20V19H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 11H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{stats.total_quizzes_answered}</span>
              <label>総解答数</label>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={iconAnalytics} alt="平均正答率" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{stats.accuracy.toFixed(1)}%</span>
              <label>平均正答率</label>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#f5f5f5' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.iconGrey}><path d="M12 6V12L16 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className={styles.cardContent}>
              {/* <span className={styles.cardValue}>2時間前</span> */}
              <span className={styles.cardValue}>N/A</span>
              <label>最終活動</label>
            </div>
          </div>
        </section>

        {/* --- 2カラムレイアウト（投稿と解答） --- */}
        <section className={styles.activityGrid}>

          {/* --- 最近の投稿 --- */}
          <div className={styles.activityCard}>
            <h3>最近の投稿 ({recent_posts.length}件)</h3>
            <div className={styles.activityList}>
              {recent_posts.length === 0 ? (
                <p className={styles.noActivity}>まだ投稿がありません。</p>
              ) : (
                recent_posts.map(post => (
                  <div key={post.id} className={styles.activityItem}>
                    <img src={post.content_type === 'quiz' ? iconQuiz : iconTrivia} alt="icon" />
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{post.title}</span>
                      <small>{formatDateTime(post.created_at)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* --- 最近の解答 --- */}
          <div className={styles.activityCard}>
            <h3>最近の解答 ({recent_answers.length}件)</h3>
            <div className={styles.activityList}>
              {recent_answers.length === 0 ? (
                <p className={styles.noActivity}>まだ解答がありません。</p>
              ) : (
                recent_answers.map(answer => (
                  <div key={answer.id} className={styles.activityItem}>
                    {answer.is_correct ? (
                      <span className={`${styles.answerIcon} ${styles.correct}`}>✓</span>
                    ) : (
                      <span className={`${styles.answerIcon} ${styles.incorrect}`}>×</span>
                    )}
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{answer.quiz_title}</span>
                      {/* ★★★ ここがエラー箇所でした ★★★ */}
                      <small>{formatDateTime(answer.answered_at)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </main>

      {/* --- フッター（スマホ用） --- */}
      <footer className={styles.mobileFooter}>
        <Link to="/teacher/dashboard" className={styles.mobileNavButton}>
          <img src={iconDashboard} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ダッシュボード</span>
        </Link>
        <Link to="/teacher/teams" className={styles.mobileNavButtonActive}>
          <img src={iconTeam} alt="" className={styles.navIconMobile} />
          <span>チーム管理</span>
        </Link>
        <Link to="/teacher/corrections" className={styles.mobileNavButton}>
          <img src={iconFlag} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>指摘管理</span>
        </Link>
        <button onClick={handleLogout} className={styles.mobileNavButton}>
          <img src={iconLogout} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ログアウト</span>
        </button>
      </footer>
    </div>
  );
};

export default StudentDetail;