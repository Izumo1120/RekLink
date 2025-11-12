// このファイルは src/pages/teacher/TeamManagement/ フォルダに配置してください。
"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './TeamManagement.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { getMyTeams, createTeam, regenerateCode } from '@lib/api';

// --- アイコンのアセット ---
import logoBook from '@assets/icons/note-1.png';
import iconTeam from '@assets/icons/people-1.png';
import iconDashboard from '@assets/icons/icon-dashboard-inactive.png'; // 非アクティブな家
import iconFlag from '@assets/icons/achieve-2.png';
import iconLogout from '@assets/icons/icon-logout.png';

const TeamManagement = () => {
  const navigate = useNavigate();

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // --- データ取得ロジック ---
  const fetchTeams = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      setStatus('loading');
      const teamsData = await getMyTeams(token);
      setTeams(teamsData);
      setStatus('ready');
    } catch (err: any) {
      setError(err.message || 'チーム情報の読み込みに失敗しました。');
      setStatus('error');
    }
  };

  // --- 認証ガード & 初期データ取得 ---
  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'teacher' && user.role !== 'admin') {
      navigate('/home');
      return;
    }
    fetchTeams();
  }, [isAuthenticated, user, token, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- 新規チーム作成フォームの処理 ---
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !newTeamName) return;

    setIsCreating(true);
    try {
      await createTeam(token, newTeamName);
      setNewTeamName(''); // フォームをリセット
      setShowCreateForm(false); // フォームを閉じる
      await fetchTeams(); // チーム一覧を再読み込み
    } catch (err: any) {
      setError(err.message || 'チームの作成に失敗しました。');
    } finally {
      setIsCreating(false);
    }
  };

  // --- 既存チームのアクション ---
  const handleCopyCode = (code: string) => {
    // navigator.clipboard.writeText は iframe 内で失敗することがあるため、
    // document.execCommand を使った古い方法でコピーします。
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      alert(`参加コード "${code}" をクリップボードにコピーしました。`);
    } catch (err) {
      alert('コピーに失敗しました。');
    }
    document.body.removeChild(ta);
  };

  const handleRegenerate = async (teamId: string) => {
    if (!token || !window.confirm('参加コードを再生成しますか？\n（古いコードは使えなくなります）')) {
      return;
    }
    try {
      await regenerateCode(token, teamId);
      await fetchTeams(); // チーム一覧を再読み込み
    } catch (err: any) {
      setError(err.message || 'コードの再生成に失敗しました。');
    }
  };

  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>チーム情報を読み込み中...</div>;
  }

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
          <button className={styles.navButtonActive}>
            <img src={iconTeam} alt="" className={styles.navIcon} />
            <span>チーム管理</span>
          </button>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#2E7D32" /></svg>
              <span>ダッシュボードに戻る</span>
            </button>
            <h2>チーム管理</h2>
            <p>クラスやグループを管理します</p>
          </div>
          <button className={styles.createTeamButton} onClick={() => setShowCreateForm(true)}>
            {/* インラインSVGでプラスアイコン */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4.16669V15.8334M4.16669 10H15.8334" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>新しいチーム</span>
          </button>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        {/* --- 新規チーム作成フォーム（条件付き表示） --- */}
        {showCreateForm && (
          <div className={`${styles.teamCard} ${styles.createForm}`}>
            <h3>新しいチームを作成</h3>
            <form onSubmit={handleCreateTeam}>
              <div className={styles.formGroup}>
                <label htmlFor="teamName">チーム名</label>
                <input
                  type="text"
                  id="teamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="例: 3年A組"
                  required
                  disabled={isCreating}
                />
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={isCreating}
                >
                  {isCreating ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- 既存チーム一覧 --- */}
        {status === 'ready' && teams.length === 0 && !showCreateForm && (
          <p>まだチームが作成されていません。</p>
        )}

        {teams.map((team) => (
          <div key={team.id} className={styles.teamCard}>
            <div className={styles.cardTitle}>
              <img src={iconTeam} alt="チーム" />
              <h3>{team.name}</h3>
              {/* <span className={styles.studentCount}>28 名</span> */}
            </div>

            <div className={styles.cardContent}>
              <div className={styles.teamInfo}>
                <h4>チーム情報</h4>
                <p>登録メンバー: <span>- 名</span></p> {/* TODO: 生徒数をAPIから取得 */}
                <p>作成日: <span>{new Date(team.created_at).toLocaleDateString()}</span></p>
              </div>
              <div className={styles.joinCode}>
                <h4>参加コード</h4>
                <div className={styles.codeDisplay}>{team.join_code}</div>
                <div className={styles.codeActions}>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => handleCopyCode(team.join_code)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.6667 1.33331H3.33333C2.59695 1.33331 2 1.93027 2 2.66665V10.6666C2 11.403 2.59695 12 3.33333 12H10.6667C11.403 12 12 11.403 12 10.6666V2.66665C12 1.93027 11.403 1.33331 10.6667 1.33331Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.9997 4H13.333C12.5967 4 11.9997 4.59695 11.9997 5.33333V13.3333C11.9997 14.0697 12.5967 14.6667 13.333 14.6667H10.6663" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    コピー
                  </button>
                  <button
                    className={`${styles.button} ${styles.buttonDangerOutline}`}
                    onClick={() => handleRegenerate(team.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.33301 6V2.66667H4.66634M14.6663 10V13.3333H11.333M2.75301 9.33333C3.21115 11.8331 5.39579 13.6667 8.00001 13.6667C11.2215 13.6667 13.8261 11.3378 14.5463 8.33333M1.45301 7.66667C2.17316 4.66222 4.77783 2.33333 8.00001 2.33333C9.76159 2.33333 11.3435 2.97394 12.5063 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    再生成
                  </button>
                </div>
                <small>生徒はこのコードを使ってチームに参加できます</small>
              </div>
            </div>

            <div className={styles.cardActions}>
              <Link to={`/teacher/team/${team.id}`} className={`${styles.button} ${styles.buttonSecondary}`}>
                メンバー一覧
              </Link>
              <button className={`${styles.button} ${styles.buttonSecondary}`} disabled>
                設定 (未実装)
              </button>
            </div>
          </div>
        ))}

      </main>

      {/* --- フッター（スマホ用） --- */}
      <footer className={styles.mobileFooter}>
        <Link to="/teacher/dashboard" className={styles.mobileNavButton}>
          <img src={iconDashboard} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ダッシュボード</span>
        </Link>
        <button className={styles.mobileNavButtonActive}>
          <img src={iconTeam} alt="" className={styles.navIconMobile} />
          <span>チーム管理</span>
        </button>
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

export default TeamManagement;