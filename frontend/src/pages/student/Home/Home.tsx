"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Home.module.css';

// APIクライアントとストアをインポート
import { getStudentTeam, joinTeam, getFeed } from '@lib/api';
import { useUserStore } from '@store/userStore';

// ★★★ 新規インポート ★★★
// ホーム画面でフィードを表示するためのカードコンポーネント
import QuizCard from '@components/features/quiz/QuizCard.tsx';

// フッターナビゲーション用のアイコン
import iconHome from '@assets/icons/icon-dashboard-active.png'; // 緑色の家
import iconBook from '@assets/icons/note-1.png';
import iconUser from '@assets/icons/people-1.png';
// ★ TODO: 'plus' アイコンを src/assets/icons/icon-plus.png として保存してください
import iconPlus from '@assets/icons/icon-plus.png';
import logoBook from '@assets/icons/note-1.png';

const Home = () => {
  const navigate = useNavigate();

  // --- 1. 認証状態の取得 ---
  // getSnapshotの警告と無限ループを避けるため、セレクタを個別に分割
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'checking' | 'joining' | 'ready' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<(Quiz | Trivia)[]>([]);

  // --- 2. 認証ガード & データ取得 ---
  useEffect(() => {
    // 2a. 認証ガード (ログインしていない)
    if (!isAuthenticated || !token || !user) {
      navigate('/login');
      return;
    }
    // 2b. 役割ガード (生徒ではない)
    if (user.role !== 'student') {
      navigate('/teacher/dashboard'); // 教師はダッシュボードへ
      return;
    }

    // 2c. データ取得ロジック (生徒である場合)
    const fetchData = async () => {
      try {
        // 3. 【重要】チーム参加確認
        await getStudentTeam(token);

        // 4. チームに参加済みの場合：フィードを取得
        const feed = await getFeed(token);
        setFeedItems(feed);
        setStatus('ready'); // フィード表示状態に切り替え

      } catch (err: any) {
        // 404エラー (Team not found / not part) は「チーム未参加」として扱う
        if (err.message && (err.message.toLowerCase().includes('not part') || err.message.toLowerCase().includes('not found'))) {
          setStatus('joining'); // チーム参加モーダル表示状態に切り替え
        } else {
          // その他のAPIエラー
          setError(err.message || 'データの取得に失敗しました。');
          setStatus('error');
        }
      }
    };

    // ★★★ 無限ループ修正 ★★★
    // statusが 'checking' の時のみ API呼び出しを実行するようにガードします
    if (status === 'checking') {
      fetchData();
    }

  }, [isAuthenticated, user, token, navigate, status]); // <-- 依存配列に 'status' を追加


  // --- 3. チーム参加モーダルのロジック ---
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinTeam = async (e: FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    if (joinCode.length !== 6) {
      setJoinError('参加コードは6桁で入力してください。');
      return;
    }

    setIsJoining(true);

    try {
      if (!token) throw new Error('認証トークンがありません。');

      await joinTeam(token, joinCode);

      // 成功した場合、フィード表示状態に切り替え
      //（statusを'checking'に戻すことで、useEffectが再実行される）
      setStatus('checking');

    } catch (err: any) {
      console.error('チーム参加失敗:', err);
      setJoinError(err.message || '参加コードが正しくありません。');
    } finally {
      setIsJoining(false);
    }
  };

  // --- レンダリング ---

  // 1. 認証・チーム確認中
  if (status === 'checking') {
    return <div className={styles.loadingScreen}>読み込み中...</div>;
  }

  // 2. エラー発生時
  if (status === 'error') {
    return <div className={styles.loadingScreen}>エラー: {error}</div>;
  }

  // 3. チーム未参加の場合（モーダルを表示）
  if (status === 'joining') {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h2>チームに参加しよう</h2>
          <p>学習を始めるには、教師から共有された6桁の参加コードを入力してください。</p>
          <form onSubmit={handleJoinTeam}>
            {joinError && <p className={styles.errorMessage}>{joinError}</p>}
            <div className={styles.formGroup}>
              <label htmlFor="joinCode">参加コード</label>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="6桁のコード"
                required
                maxLength={6}
                disabled={isJoining}
              />
            </div>
            <button type="submit" className={styles.submitButton} disabled={isJoining}>
              {isJoining ? '参加中...' : 'チームに参加'}
            </button>
          </form>
          {/* TODO: ログアウト機能の実装 */}
        </div>
      </div>
    );
  }

  // 4. 準備完了（フィードを表示）
  return (
    <div className={styles.homeContainer}>

      {/* --- ヘッダー（PC・タブレット用）--- */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src={logoBook} alt="RekLink Logo" />
          <h1>RekLink Learning</h1>
        </div>
        <nav className={styles.headerNav}>
          <button className={styles.navButtonActive}>
            <img src={iconHome} alt="" className={styles.navIcon} />
            <span>ホーム</span>
          </button>
          <Link to="/mypage" className={styles.navButton}> {/* TODO: /mypage */}
            <img src={iconUser} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>マイページ</span>
          </Link>
          <Link to="/create" className={styles.navButton}> {/* TODO: /create */}
            <img src={iconPlus} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>投稿作成</span>
          </Link>
          {/* TODO: ログアウト機能 */}
        </nav>
      </header>

      {/* --- メインコンテンツ --- */}
      <main className={styles.mainContent}>

        {/* --- タブ切り替え --- */}
        <div className={styles.tabContainer}>
          <div className={styles.tabs}>
            <button className={styles.tabActive}>おすすめ</button>
            <button className={styles.tabButton}>保存済み</button>
          </div>
          <button className={styles.refreshButton}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.66699 10C1.66699 14.6025 5.39783 18.3334 10.0003 18.3334C14.6028 18.3334 18.3337 14.6025 18.3337 10C18.3337 5.39752 14.6028 1.66669 10.0003 1.66669C7.8872 1.66669 5.96131 2.47231 4.50033 3.82504M4.50033 3.82504V1.66669M4.50033 3.82504H6.66699" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>更新</span>
          </button>
        </div>

        {/* --- フィード一覧 --- */}
        <div className={styles.feedList}>
          {feedItems.length === 0 ? (
            <div className={styles.emptyFeed}>
              <img src={iconBook} alt="コンテンツなし" />
              <p>保存したコンテンツはありません</p>
            </div>
          ) : (
            feedItems.map((item) => (
              // ★★★ QuizCard コンポーネントを使用 ★★★
              <QuizCard key={item.id} item={item} />
            ))
          )}
        </div>
      </main>

      {/* --- フッター（スマホ用） --- */}
      <footer className={styles.mobileFooter}>
        <button className={styles.mobileNavButtonActive}>
          <img src={iconHome} alt="" className={styles.navIconMobile} />
          <span>ホーム</span>
        </button>
        <Link to="/quizzes" className={styles.mobileNavButton}> {/* TODO: /quizzes or /search */}
          <img src={iconBook} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>学習</span>
        </Link>
        <Link to="/create" className={styles.mobileNavButton}>
          <div className={styles.createButton}>
            <img src={iconPlus} alt="" className={`${styles.navIconMobile} ${styles.navIconPlus}`} />
          </div>
          <span>投稿</span>
        </Link>
        <Link to="/mypage" className={styles.mobileNavButton}>
          <img src={iconUser} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>マイページ</span>
        </Link>
      </footer>
    </div>
  );
};

export default Home;