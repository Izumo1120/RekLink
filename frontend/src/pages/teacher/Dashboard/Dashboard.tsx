// このファイルは src/pages/teacher/Dashboard/ フォルダに配置してください。
"use client";

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { getDashboardSummary, getPopularTags, getWeeklyActivity } from '@lib/api';

// Rechartsのインポート
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- アイコンのアセット ---
// (src/assets/icons/ に指定の名前で保存されていることを想定)

// 1. ユーザー提供のアイコン
import logoBook from '@assets/icons/note-1.png';
import iconStudents from '@assets/icons/people-1.png';
import iconAnalytics from '@assets/icons/graph-1.png';
import iconDashboardActive from '@assets/icons/icon-dashboard-active.png'; // 緑色の家
import iconLogout from '@assets/icons/icon-logout.png'; // 白抜きのドア
import iconAlert from '@assets/icons/icon-alert-danger.png'; // 赤い警告マーク

// ★★★ 修正 ★★★
// lucide-react の代わりに、アップロードされたアセットを使用
import iconTeam from '@assets/icons/people-1.png'; // チーム管理 (lucide: Users の代わり)
import iconFlag from '@assets/icons/achieve-2.png'; // 指摘管理 (lucide: Flag の代わり)
// iconDashboardInactive は未使用のため削除


// ダミーデータは削除しました

const Dashboard = () => {
  const navigate = useNavigate();

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);

  // --- 認証ガード & データ取得 ---
  useEffect(() => {
    // 1. 認証ガード (ログインしていない)
    if (!isAuthenticated || !token || !user) {
      navigate('/login');
      return;
    }
    // 2. 役割ガード (教師・管理者ではない)
    if (user.role !== 'teacher' && user.role !== 'admin') {
      navigate('/home'); // 生徒は生徒用ホームにリダイレクト
      return;
    }

    // 3. データ取得ロジック
    const fetchData = async () => {
      try {
        setStatus('loading');
        // 4. APIを並行して呼び出す
        const [summaryData, tagsData, activityData] = await Promise.all([
          getDashboardSummary(token),
          getPopularTags(token),
          getWeeklyActivity(token)
        ]);
        setSummary(summaryData);
        setPopularTags(tagsData);
        setWeeklyActivity(activityData);
        setStatus('ready');
      } catch (err: any) {
        setError(err.message || 'ダッシュボードの読み込みに失敗しました。');
        setStatus('error');
      }
    };

    fetchData();
  }, [isAuthenticated, user, token, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>ダッシュボードを読み込み中...</div>;
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
          {/* ★ ダッシュボード (アクティブ) */}
          <button className={styles.navButtonActive}>
            <img src={iconDashboardActive} alt="" className={styles.navIcon} />
            <span>ダッシュボード</span>
          </button>

          {/* ★★★ 修正 ★★★: チーム管理 (lucide -> img) */}
          <Link to="/teacher/teams" className={styles.navButton}>
            <img src={iconTeam} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>チーム管理</span>
          </Link>

          {/* ★★★ 修正 ★★★: 指摘管理 (lucide -> img) */}
          <Link to="/teacher/corrections" className={styles.navButton}>
            <img src={iconFlag} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>指摘管理</span>
          </Link>

          {/* ★ ログアウト */}
          <button onClick={handleLogout} className={styles.navButton}>
            <img src={iconLogout} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>ログアウト</span>
          </button>
        </div>
      </header>

      {/* --- メインコンテンツ --- */}
      <main className={styles.dashboardContainer}>

        <div className={styles.pageTitle}>
          <h2>教師ダッシュボード</h2>
          <p>クラス全体の学習状況を確認できます</p>
        </div>

        {/* --- 4つのサマリーカード --- */}
        <section className={styles.summaryGrid}>
          {/* 登録生徒数 */}
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={iconStudents} alt="生徒数" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{summary?.total_students ?? 0}</span>
              <label>登録生徒数</label>
            </div>
          </div>
          {/* 総投稿数 (アイコンをnote-1.pngに変更) */}
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={logoBook} alt="投稿数" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{summary?.total_posts_created ?? 0}</span>
              <label>総投稿数</label>
            </div>
          </div>
          {/* 平均正答率 */}
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#e8f5e9' }}>
              <img src={iconAnalytics} alt="正答率" className={styles.iconGreen} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{summary?.overall_accuracy.toFixed(1) ?? 0}%</span>
              <label>平均正答率</label>
            </div>
          </div>
          {/* ★ 未対応の指摘 (アイコン変更) */}
          <div className={`${styles.summaryCard} ${styles.dangerCard}`}>
            <div className={styles.cardIcon} style={{ backgroundColor: '#ffebee' }}>
              <img src={iconAlert} alt="未対応の指摘" className={styles.iconRed} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{summary?.pending_reports_count ?? 0}</span>
              <label>未対応の指摘</label>
            </div>
            <Link to="/teacher/corrections" className={styles.cardLink}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 13L11 8L6 3" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </section>

        {/* --- チーム選択 --- */}
        <section className={styles.teamSelector}>
          <label htmlFor="team-select">チーム:</label>
          <select id="team-select" defaultValue="">
            {/* TODO: /api/v1/teams から取得したチーム一覧をここに展開 */}
            <option value="">全チーム</option>
            <option value="team1">3年A組</option>
          </select>
          <Link to="/teacher/teams" className={styles.teamManageButton}>
            チーム管理
          </Link>
        </section>

        {/* --- チャートエリア --- */}
        <section className={styles.chartsGrid}>
          {/* 週間活動推移 (折れ線グラフ) */}
          <div className={styles.chartCard}>
            <h3>週間活動推移</h3>
            <div className={styles.chartContainer}>
              {weeklyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyActivity.map(item => ({
                    ...item,
                    name: new Date(item.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis
                      dataKey="name"
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                    />
                  <YAxis
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E0E0E0',
                      borderRadius: '4px'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#2E7D32"
                    strokeWidth={2}
                    name="投稿数"
                    dot={{ fill: '#2E7D32', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="answers"
                    stroke="#1976D2"
                    strokeWidth={2}
                    name="解答数"
                    dot={{ fill: '#1976D2', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              ) : (
                <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>活動データがありません。</p>
              )}
            </div>
          </div>
          {/* 科目別投稿数 (棒グラフ) */}
          <div className={styles.chartCard}>
            <h3>科目別投稿数 (人気タグ)</h3>
            <div className={styles.chartContainer}>
              {popularTags.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={popularTags.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis
                      dataKey="tag_name"
                      stroke="#666"
                      style={{ fontSize: '11px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E0E0E0',
                        borderRadius: '4px'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="usage_count"
                      fill="#2E7D32"
                      name="投稿数"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>タグデータがありません。</p>
              )}
            </div>
          </div>
        </section>

        {/* アクティブな生徒セクションは将来実装予定 */}

      </main>

      {/* --- フッター（スマホ用） --- */}
      <footer className={styles.mobileFooter}>
        {/* ★ ダッシュボード (アクティブ) */}
        <button className={styles.mobileNavButtonActive}>
          <img src={iconDashboardActive} alt="" className={styles.navIconMobile} />
          <span>ダッシュボード</span>
        </button>

        {/* ★★★ 修正 ★★★: チーム管理 (lucide -> img) */}
        <Link to="/teacher/teams" className={styles.mobileNavButton}>
          <img src={iconTeam} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>チーム管理</span>
        </Link>

        {/* ★★★ 修正 ★★★: 指摘管理 (lucide -> img) */}
        <Link to="/teacher/corrections" className={styles.mobileNavButton}>
          <img src={iconFlag} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>指摘管理</span>
        </Link>

        {/* ★ ログアウト */}
        <button onClick={handleLogout} className={styles.mobileNavButton}>
          <img src={iconLogout} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ログアウト</span>
        </button>
      </footer>
    </div>
  );
};

export default Dashboard;