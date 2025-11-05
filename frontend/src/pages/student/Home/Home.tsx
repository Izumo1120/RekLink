"use client"; // Vite環境では不要ですが、Reactの規約として

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

// api.ts から必要な関数をインポート
import { getStudentTeam, joinTeam, getFeed } from '@lib/api';
// userStore から認証情報をインポート
import { useUserStore } from '@store/userStore';

const Home = () => {
  const navigate = useNavigate();

  // --- 1. 認証状態の取得 ---
  // getSnapshotの警告と無限ループを避けるため、セレクタを個別に分割します
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());

  // --- 画面の状態管理 ---
  // 'checking' (認証・チーム確認中)
  // 'joining' (チーム参加モーダル表示)
  // 'ready' (フィード表示)
  // 'error' (エラー表示)
  const [status, setStatus] = useState<'checking' | 'joining' | 'ready' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<(Quiz | Trivia)[]>([]);

  // --- 2. 認証ガード & データ取得 ---
  useEffect(() => {
    // 2a. 認証ガード (ログインしていない)
    if (!isAuthenticated || !token || !user) {
      // navigate('/login'); // HMR(ホットリロード)中に実行されると不便なので、必要に応じてコメント解除
      return;
    }
    // 2b. 役割ガード (生徒ではない)
    if (user.role !== 'student') {
      navigate('/teacher/dashboard'); // 仮の教師用ダッシュボードパス
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
        // 404エラー (Team not found) は「チーム未参加」として扱う
        if (err.message && (err.message.toLowerCase().includes('not part') || err.message.toLowerCase().includes('not found'))) {
          setStatus('joining'); // チーム参加モーダル表示状態に切り替え
        } else {
          // その他のAPIエラー
          setError(err.message || 'データの取得に失敗しました。');
          setStatus('error');
        }
      }
    };

    // 無限ループを解消するため、statusが 'checking' の時のみ
    // API呼び出しを実行するようにガードします
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
      {/* TODO: ヘッダーやナビゲーションバーをここに配置 */}
      <header className={styles.header}>
        <h1>ホーム</h1>
        {/* TODO: 検索バーやマイページへのリンク */}
      </header>

      <main className={styles.feedList}>
        {feedItems.length === 0 ? (
          <p>表示するコンテンツがまだありません。</p>
        ) : (
          feedItems.map((item) => (
            // TODO: ここを QuizCard コンポーネントに差し替える
            <div key={item.id} className={styles.quizCardDummy}>
              <h3>{item.title}</h3>
              <p>({item.content_type === 'quiz' ? 'クイズ' : '豆知識'})</p>
            </div>
          ))
        )}
      </main>
      {/* TODO: フッターやコンテンツ作成ボタン(+)をここに配置 */}
    </div>
  );
};

export default Home;

