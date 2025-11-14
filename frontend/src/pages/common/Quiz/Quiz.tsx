"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Quiz.module.css';

// APIクライアントをインポート
import { getPublicFeed } from '@lib/api';

// カードコンポーネント
import PublicQuizCard from '@components/features/quiz/PublicQuizCard';

// アイコン
import iconBook from '@assets/icons/note-1.png';
import iconRefresh from '@assets/icons/icon-refresh.png';

type TabType = 'quiz' | 'trivia';

const Quiz = () => {
  const navigate = useNavigate();

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<(Quiz | Trivia)[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('quiz');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- 初期データ取得 ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setStatus('loading');
      const feed = await getPublicFeed();
      setFeedItems(feed);
      setStatus('ready');
    } catch (err: any) {
      setError(err.message || 'データの取得に失敗しました。');
      setStatus('error');
    }
  };

  // --- タブ切り替えロジック ---
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const feed = await getPublicFeed();
      setFeedItems(feed);
    } catch (error: any) {
      console.error('更新に失敗しました:', error);
      alert(error.message || '更新に失敗しました。');
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- フィルタリング ---
  const filteredItems = feedItems.filter(item => {
    if (activeTab === 'quiz') {
      return item.content_type === 'quiz';
    } else {
      return item.content_type === 'trivia';
    }
  });

  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>読み込み中...</div>;
  }

  if (status === 'error') {
    return <div className={styles.loadingScreen}>エラー: {error}</div>;
  }

  return (
    <div className={styles.quizContainer}>
      {/* --- ページタイトル --- */}
      <div className={styles.pageHeader}>
        <h1>RekLink 公開クイズ</h1>
        <p>みんなが作成した問題と豆知識を楽しもう</p>
      </div>

      {/* --- メインコンテンツ --- */}
      <main className={styles.mainContent}>

        {/* --- タブ切り替え --- */}
        <div className={styles.tabContainer}>
          <div className={styles.tabs}>
            <button
              className={activeTab === 'quiz' ? styles.tabActive : styles.tabButton}
              onClick={() => handleTabChange('quiz')}
              disabled={isRefreshing}
            >
              クイズ
            </button>
            <button
              className={activeTab === 'trivia' ? styles.tabActive : styles.tabButton}
              onClick={() => handleTabChange('trivia')}
              disabled={isRefreshing}
            >
              豆知識
            </button>
          </div>
          <button className={styles.refreshButton} onClick={handleRefresh} disabled={isRefreshing}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.66699 10C1.66699 14.6025 5.39783 18.3334 10.0003 18.3334C14.6028 18.3334 18.3337 14.6025 18.3337 10C18.3337 5.39752 14.6028 1.66669 10.0003 1.66669C7.8872 1.66669 5.96131 2.47231 4.50033 3.82504M4.50033 3.82504V1.66669M4.50033 3.82504H6.66699" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{isRefreshing ? '更新中...' : '更新'}</span>
          </button>
        </div>

        {/* --- フィード一覧 --- */}
        <div className={styles.feedList}>
          {filteredItems.length === 0 ? (
            <div className={styles.emptyFeed}>
              <img src={iconBook} alt="コンテンツなし" />
              <p>{activeTab === 'quiz' ? 'クイズがありません' : '豆知識がありません'}</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <PublicQuizCard key={item.id} item={item} onUpdate={handleRefresh} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Quiz;
