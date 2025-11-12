// このファイルは src/pages/teacher/TeamDetail/ フォルダに配置してください。
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import styles from './TeamDetail.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { getTeamMembersWithLearningSummary } from '@lib/api';

// --- アイコンのアセット ---
import logoBook from '@assets/icons/note-1.png';
import iconDashboard from '@assets/icons/icon-dashboard-inactive.png';
import iconTeam from '@assets/icons/people-1.png';
import iconFlag from '@assets/icons/achieve-2.png';
import iconLogout from '@assets/icons/icon-logout.png';
import iconArrowLeft from '@assets/icons/icon-arrow-left.png';
import iconPosts from '@assets/icons/note-1.png'; // 平均投稿数 (note-1.pngで代用)
import iconAnalytics from '@assets/icons/graph-1.png'; // 平均正答率

const TeamDetail = () => {
  const navigate = useNavigate();
  const { id: teamId } = useParams(); // URLからチームIDを取得

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamMembersListResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    if (!teamId) {
      setError('チームIDが見つかりません。');
      setStatus('error');
      return;
    }

    // 2. データ取得ロジック
    const fetchData = async () => {
      try {
        setStatus('loading');
        // バックエンドAPIを呼び出し
        const data = await getTeamMembersWithLearningSummary(token, teamId);
        setTeamData(data);
        setStatus('ready');
      } catch (err: any) {
        setError(err.message || 'チーム情報の読み込みに失敗しました。');
        setStatus('error');
      }
    };
    fetchData();
  }, [isAuthenticated, user, token, navigate, teamId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- 検索フィルター ---
  const filteredMembers = useMemo(() => {
    if (!teamData) return [];
    return teamData.members.filter(member =>
      (member.nickname && member.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teamData, searchTerm]);

  // --- イニシャル取得ヘルパー ---
  const getInitials = (name: string | null) => {
    if (!name) return '？';
    // 苗字と名前の最初の文字を取得しようと試みる
    const names = name.trim().split(/[\s,]+/); // スペースやカンマで分割
    if (names.length >= 2) {
      return (names[0][0] || '') + (names[1][0] || '');
    }
    // 名前の最初の2文字
    return name.substring(0, 2).toUpperCase();
  };

  // --- 日付フォーマットヘルパー ---
  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // --- 最終活動日のフォーマット (ダミー) ---
  const formatLastActivity = (dateString: string | null) => {
    // TODO: '○時間前' '○日前' を計算するロジック
    if (!dateString) return '活動なし';
    return '2時間前'; // ダミー
  };


  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>メンバー情報を読み込み中...</div>;
  }

  if (status === 'error') {
    return <div className={styles.loadingScreen}>エラー: {error}</div>;
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
            <button onClick={() => navigate('/teacher/teams')} className={styles.backButton}>
              <img src={iconArrowLeft} alt="戻る" className={styles.backButtonIcon} />
              <span>チーム管理に戻る</span>
            </button>
            <h2>{teamData?.team_name} - メンバー一覧</h2>
            <p>チームメンバーの学習状況を確認できます</p>
          </div>
        </div>

        {/* --- 3つのサマリーカード --- */}
        <section className={styles.summaryGrid}>
          {/* アクティブメンバー */}
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={iconTeam} alt="アクティブメンバー" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>
                {teamData?.active_members_count ?? 0} / {teamData?.total_members ?? 0}
              </span>
              <label>アクティブメンバー</label>
            </div>
          </div>
          {/* 平均投稿数 */}
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={iconPosts} alt="平均投稿数" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{teamData?.average_posts_per_member.toFixed(1) ?? 0}</span>
              <label>平均投稿数</label>
            </div>
          </div>
          {/* 平均正答率 */}
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={iconAnalytics} alt="平均正答率" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{teamData?.overall_average_accuracy.toFixed(1) ?? 0}%</span>
              <label>平均正答率</label>
            </div>
          </div>
        </section>

        {/* --- 検索バー --- */}
        <section className={styles.searchBarContainer}>
          <div className={styles.searchIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <input
            type="text"
            placeholder="メンバーを検索 (名前またはメール)"
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </section>

        {/* --- メンバー一覧 --- */}
        <section className={styles.memberListCard}>
          <h3>メンバー一覧 ({filteredMembers.length}名)</h3>
          <div className={styles.memberList}>
            {filteredMembers.length === 0 ? (
              <p className={styles.noMembers}>該当するメンバーが見つかりません。</p>
            ) : (
              filteredMembers.map((member) => (
                <div key={member.user_id} className={styles.memberItem}>
                  <div className={styles.memberProfile}>
                    <div className={styles.memberInitial}>
                      {getInitials(member.nickname)}
                    </div>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{member.nickname || '未設定'}</span>
                      <span className={styles.memberEmail}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 3.5H12.25M1.75 3.5C1.75 3.08579 2.08579 2.75 2.5 2.75H11.5C11.9142 2.75 12.25 3.08579 12.25 3.5M1.75 3.5V10.5C1.75 10.9142 2.08579 11.25 2.5 11.25H11.5C11.9142 11.25 12.25 10.9142 12.25 10.5V3.5M1.75 3.5L7 7.875L12.25 3.5" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {member.email}
                      </span>
                    </div>
                    {member.learning_summary.is_active ? (
                      <span className={`${styles.statusBadge} ${styles.statusActive}`}>アクティブ</span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.statusInactive}`}>非アクティブ</span>
                    )}
                    <button className={styles.menuButton}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.0003 10.8333C10.4606 10.8333 10.8337 10.4602 10.8337 9.99996C10.8337 9.53972 10.4606 9.16663 10.0003 9.16663C9.54011 9.16663 9.16699 9.53972 9.16699 9.99996C9.16699 10.4602 9.54011 10.8333 10.0003 10.8333Z" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10.0003 4.16671C10.4606 4.16671 10.8337 3.79362 10.8337 3.33337C10.8337 2.87313 10.4606 2.50004 10.0003 2.50004C9.54011 2.50004 9.16699 2.87313 9.16699 3.33337C9.16699 3.79362 9.54011 4.16671 10.0003 4.16671Z" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10.0003 17.5C10.4606 17.5 10.8337 17.1269 10.8337 16.6666C10.8337 16.2064 10.4606 15.8333 10.0003 15.8333C9.54011 15.8333 9.16699 16.2064 9.16699 16.6666C9.16699 17.1269 9.54011 17.5 10.0003 17.5Z" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                  <div className={styles.memberStats}>
                    <div className={styles.statItem}>
                      <label>投稿数</label>
                      <span>{member.learning_summary.posts_count}</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>解答数</label>
                      <span>{member.learning_summary.answers_count}</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>正答率</label>
                      <span>{member.learning_summary.accuracy.toFixed(0)}%</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>最終活動</label>
                      <span>{formatLastActivity(member.learning_summary.last_activity_at)}</span>
                    </div>
                  </div>
                  <small className={styles.joinDate}>参加日: {formatJoinDate(member.joined_at)}</small>
                </div>
              ))
            )}
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

export default TeamDetail;