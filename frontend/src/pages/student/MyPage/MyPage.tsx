// このファイルは src/pages/student/MyPage/ フォルダに配置してください。
"use client";

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './MyPage.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import {
  getUserStats,
  getMyPosts,
  getMyAnswers,
  getMyLikes,
  getMyReports
} from '@lib/api';

// --- アイコンのアセット ---
import logoBook from '@assets/icons/note-1.png';
import iconHome from '@assets/icons/icon-dashboard-inactive.png';
import iconBook from '@assets/icons/note-1.png';
import iconMyPage from '@assets/icons/people-1.png';
import iconLogout from '@assets/icons/icon-logout.png';
import Heart from '@assets/icons/heart.png';
import Check from '@assets/icons/icon-checkmark.png';
import X from '@assets/icons/icon-reject.png';

type ActiveTab = 'posts' | 'answers' | 'reports';

const MyPage = () => {
  const navigate = useNavigate();

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('posts');

  // --- データ用State ---
  const [stats, setStats] = useState<UserStats | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [posts, setPosts] = useState<ContentInfo[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [reports, setReports] = useState<ReportDetails[]>([]);


  // --- 認証ガード & 初期データ取得 ---
  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'student') {
      navigate('/teacher/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setStatus('loading');
        // 4つの統計カード + 3つのタブのデータをすべて並行して取得
        const [statsData, likesData, postsData, answersData, reportsData] = await Promise.all([
          getUserStats(token),
          getMyLikes(token),      // いいね数取得用
          getMyPosts(token),      // 投稿一覧タブ用
          getMyAnswers(token),    // 解答履歴タブ用
          getMyReports(token),    // 受信した指摘タブ用
        ]);

        setStats(statsData);
        setLikesCount(likesData.length);
        setPosts(postsData);
        setAnswers(answersData);
        setReports(reportsData);

        setStatus('ready');

      } catch (err: any) {
        setError(err.message || 'マイページ情報の読み込みに失敗しました。');
        setStatus('error');
      }
    };

    fetchData();
  }, [isAuthenticated, user, token, navigate]);

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
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  };

  // --- タブに対応するコンテンツをレンダリング ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <div className={styles.tabContent}>
            {posts.length === 0 ? <p>まだ投稿がありません。</p> : posts.map(post => (
              <div key={post.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{post.title}</span>
                  <p>{/* 投稿内容のプレビュー（APIが返せば） */}</p>
                  <small>いいね 0</small>
                </div>
                <span className={`${styles.badge} ${post.content_type === 'quiz' ? styles.quizBadge : styles.triviaBadge}`}>
                  {post.content_type === 'quiz' ? 'クイズ' : '豆知識'}
                </span>
                <button className={styles.detailButton}>詳細</button>
              </div>
            ))}
          </div>
        );
      case 'answers':
        return (
          <div className={styles.tabContent}>
            {answers.length === 0 ? <p>まだ解答履歴がありません。</p> : answers.map(answer => (
              <div key={answer.id} className={styles.listItem}>
                {answer.is_correct ? (
                  <img src={Check} alt="正解" className={`${styles.answerIcon} ${styles.correct}`} />
                ) : (
                  <img src={X} alt="不正解" className={`${styles.answerIcon} ${styles.incorrect}`} />
                )}
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{answer.quiz_title}</span>
                  <small>{formatDateTime(answer.answered_at)}</small>
                </div>
                <span className={`${styles.badge} ${answer.is_correct ? styles.correctBadge : styles.incorrectBadge}`}>
                  {answer.is_correct ? '正解' : '不正解'}
                </span>
              </div>
            ))}
          </div>
        );
      case 'reports':
        return (
          <div className={styles.tabContent}>
            {reports.length === 0 ? <p>まだ指摘の履歴がありません。</p> : reports.map(report => (
              <div key={report.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{report.content_title}</span>
                  <p className={styles.description}>{report.description}</p>
                  <small>{formatDateTime(report.created_at)}</small>
                </div>
                <span className={`${styles.badge} ${styles[report.status]}`}>
                  {report.status === 'pending' ? '未対応' :
                    report.status === 'resolved' ? '対応済み' : '却下'}
                </span>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };


  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>マイページを読み込み中...</div>;
  }

  if (status === 'error' || !user) {
    return <div className={styles.loadingScreen}>エラー: {error || 'ユーザーデータが見つかりません'}</div>;
  }

  return (
    <div className={styles.layout}>

      {/* --- ヘッダー（PC・タブレット用）--- */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src={logoBook} alt="RekLink Logo" />
          <h1>RekLink Learning</h1>
        </div>
        <nav className={styles.headerNav}>
          <Link to="/home" className={styles.navButton}>
            <img src={iconHome} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>ホーム</span>
          </Link>
          <Link to="/quizzes" className={styles.navButton}>
            <img src={iconBook} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>学習コンテンツ</span>
          </Link>
          <Link to="/create" className={styles.navButton}>
            <svg className={`${styles.navIcon} ${styles.navIconInactive}`} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4.16669V15.8334M4.16669 10H15.8334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>投稿作成</span>
          </Link>
          <button className={styles.navButtonActive}>
            <img src={iconMyPage} alt="" className={styles.navIcon} />
            <span>マイページ</span>
          </button>
          <button onClick={handleLogout} className={styles.navButton}>
            <img src={iconLogout} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>ログアウト</span>
          </button>
        </nav>
      </header>

      {/* --- メインコンテンツ --- */}
      <main className={styles.mainContainer}>

        <div className={styles.pageTitle}>
          <h2>マイページ</h2>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.profileInitial}>
              {getInitials(user.nickname)}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user.nickname}</span>
              <span className={styles.profileRole}>{user.role === 'student' ? '生徒' : '教師'}</span>
            </div>
            {/* TODO: プロフィール編集ボタン */}
          </div>

          {/* --- 4つのサマリーカード --- */}
          <section className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.cardValue}>{stats?.posts_created ?? 0}</span>
              <label>投稿数</label>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.cardValue}>{stats?.total_quizzes_answered ?? 0}</span>
              <label>解答数</label>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.cardValue}>{stats?.accuracy.toFixed(0) ?? 0}%</span>
              <label>正答率</label>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.cardValue}>{likesCount}</span>
              <label>いいね</label>
            </div>
          </section>

          {/* --- タブ切り替え --- */}
          <div className={styles.tabContainer}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tabButton} ${activeTab === 'posts' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                投稿一覧
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'answers' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('answers')}
              >
                解答履歴
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'reports' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                受信した指摘
              </button>
            </div>
          </div>

          {/* --- タブコンテンツ --- */}
          {renderTabContent()}

        </div>
      </main>

      {/* --- フッター（スマホ用） --- */}
      <footer className={styles.mobileFooter}>
        <Link to="/home" className={styles.mobileNavButton}>
          <img src={iconHome} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ホーム</span>
        </Link>
        <Link to="/quizzes" className={styles.mobileNavButton}>
          <img src={iconBook} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>学習</span>
        </Link>
        <Link to="/create" className={styles.mobileNavButton}>
          <div className={styles.createButton}>
            <svg className={`${styles.navIconMobile} ${styles.navIconPlus}`} width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4.16669V15.8334M4.16669 10H15.8334" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span>投稿</span>
        </Link>
        <button className={styles.mobileNavButtonActive}>
          <img src={iconMyPage} alt="" className={styles.navIconMobile} />
          <span>マイページ</span>
        </button>
      </footer>
    </div>
  );
};

export default MyPage;