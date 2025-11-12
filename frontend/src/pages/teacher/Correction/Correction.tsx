// このファイルは src/pages/teacher/Correction/ フォルダに配置してください。
"use client";

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Correction.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { getReports, getReportContent, resolveReport } from '@lib/api';

// --- ★★★ 修正 ★★★ ---
// --- アイコンのアセット ---
import logoBook from '@assets/icons/note-1.png';
import iconDashboard from '@assets/icons/icon-dashboard-inactive.png';
import iconTeam from '@assets/icons/people-1.png';
import iconFlag from '@assets/icons/achieve-2.png';
import iconLogout from '@assets/icons/icon-logout.png';

// lucide-react の代わりに、アップロードされた画像を使用
import iconArrowLeft from '@assets/icons/icon-arrow-left.png';
import iconFilter from '@assets/icons/icon-filter.png';
import iconPlaceholder from '@assets/icons/icon-alert-danger.png'; // プレースホルダー用
import iconReject from '@assets/icons/icon-reject.png';
import iconCheckmark from '@assets/icons/icon-checkmark.png';
// --- ★★★ 修正ここまで ★★★ ---

type StatusFilter = 'all' | 'pending' | 'resolved';

const Correction = () => {
  const navigate = useNavigate();

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [allReports, setAllReports] = useState<ReportDetails[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentForReport | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [resolutionNote, setResolutionNote] = useState("");

  // --- データ取得ロジック ---
  const fetchReports = async () => {
    if (!token) return;
    try {
      setStatus('loading');
      const reportsData = await getReports(token);
      setAllReports(reportsData);
      setStatus('ready');
    } catch (err: any) {
      setError(err.message || '指摘情報の読み込みに失敗しました。');
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
    fetchReports();
  }, [isAuthenticated, user, token, navigate]);

  // --- アクション ---

  const handleSelectReport = async (reportId: string) => {
    if (!token) return;
    setSelectedReportId(reportId);
    setSelectedContent(null); // 詳細をリセット
    setResolutionNote(""); // メモをリセット
    setError(null); // エラーをリセット
    try {
      // 指摘対象のコンテンツ内容を取得
      const contentData = await getReportContent(token, reportId);
      setSelectedContent(contentData);
    } catch (err: any) {
      setError(err.message || 'コンテンツの読み込みに失敗しました。');
    }
  };

  const handleUpdateStatus = async (newStatus: ReportStatus) => {
    if (!token || !selectedReportId) return;

    try {
      await resolveReport(token, selectedReportId, {
        status: newStatus,
        resolution_note: resolutionNote
      });
      // 選択状態を解除し、リストを再読み込み
      setSelectedReportId(null);
      setSelectedContent(null);
      setResolutionNote("");
      await fetchReports();
    } catch (err: any) {
      setError(err.message || 'ステータスの更新に失敗しました。');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- フィルタリングロジック ---
  const counts = {
    all: allReports.length,
    pending: allReports.filter(r => r.status === 'pending' || r.status === 'in_progress').length,
    resolved: allReports.filter(r => r.status === 'resolved' || r.status === 'rejected').length
  };

  const filteredReports = allReports.filter(report => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return report.status === 'resolved' || report.status === 'rejected';
    return report.status === 'pending' || report.status === 'in_progress';
  });

  const selectedReport = allReports.find(r => r.id === selectedReportId);

  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>指摘情報を読み込み中...</div>;
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
          <Link to="/teacher/teams" className={styles.navButton}>
            <img src={iconTeam} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>チーム管理</span>
          </Link>
          <button className={styles.navButtonActive}>
            <img src={iconFlag} alt="" className={styles.navIcon} />
            <span>指摘管理</span>
          </button>
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
            {/* ★★★ 修正 ★★★ */}
            <button onClick={() => navigate('/teacher/dashboard')} className={styles.backButton}>
              <img src={iconArrowLeft} alt="戻る" className={styles.backButtonIcon} />
              <span>ダッシュボードに戻る</span>
            </button>
            <h2>指摘管理</h2>
            <p>生徒からの指摘を確認・対応します</p>
          </div>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        {/* --- タブ・フィルター --- */}
        <div className={styles.tabContainer}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tabButton} ${filter === 'all' ? styles.tabActive : ''}`}
              onClick={() => setFilter('all')}
            >
              すべて ({counts.all})
            </button>
            <button
              className={`${styles.tabButton} ${filter === 'pending' ? styles.tabActivePending : ''}`}
              onClick={() => setFilter('pending')}
              data-filter="pending"
            >
              未対応 ({counts.pending})
            </button>
            <button
              className={`${styles.tabButton} ${filter === 'resolved' ? styles.tabActive : ''}`}
              onClick={() => setFilter('resolved')}
            >
              対応済み ({counts.resolved})
            </button>
          </div>
          {/* ★★★ 修正 ★★★ */}
          <button className={styles.filterButton}>
            <img src={iconFilter} alt="フィルター" className={styles.filterIcon} />
            <span>フィルター</span>
          </button>
        </div>

        {/* --- メイン（2カラムレイアウト） --- */}
        <div className={styles.contentGrid}>

          {/* --- 左カラム：指摘リスト --- */}
          <div className={styles.reportList}>
            {filteredReports.length === 0 ? (
              <p className={styles.noReports}>表示する指摘がありません。</p>
            ) : (
              filteredReports.map(report => (
                <div
                  key={report.id}
                  className={`${styles.reportItem} ${selectedReportId === report.id ? styles.itemSelected : ''}`}
                  onClick={() => handleSelectReport(report.id)}
                >
                  <div className={styles.itemHeader}>
                    <h4>{report.content_title}</h4>
                    {report.status === 'pending' && <span className={`${styles.statusBadge} ${styles.statusPending}`}>未対応</span>}
                    {report.status === 'resolved' && <span className={`${styles.statusBadge} ${styles.statusResolved}`}>対応済み</span>}
                    {report.status === 'rejected' && <span className={`${styles.statusBadge} ${styles.statusRejected}`}>却下</span>}
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={`${styles.metaTag} ${styles[report.category]}`}>{
                      report.category === 'major_error' ? '事実誤認' :
                        report.category === 'minor_error' ? '軽微な誤り' : '改善提案'
                    }</span>
                    <span>{report.reporter_nickname || '匿名'}</span>
                  </div>
                  <p className={styles.itemDescription}>{report.description}</p>
                  <small>{new Date(report.created_at).toLocaleDateString()}</small>
                </div>
              ))
            )}
          </div>

          {/* --- 右カラム：指摘詳細 --- */}
          <div className={styles.reportDetail}>
            {!selectedReport ? (
              <div className={styles.placeholder}>
                {/* ★★★ 修正 ★★★ */}
                <img src={iconPlaceholder} alt="" className={styles.placeholderIcon} />
                <p>指摘を選択してください</p>
              </div>
            ) : (
              <div className={styles.detailContent}>
                <h3>指摘の詳細</h3>

                <div className={styles.detailGroup}>
                  <label>対象コンテンツ</label>
                  <p>{selectedReport.content_title}</p>
                </div>

                <div className={styles.detailGroup}>
                  <label>指摘の種類</label>
                  <p>
                    <span className={`${styles.metaTag} ${styles[selectedReport.category]}`}>{
                      selectedReport.category === 'major_error' ? '事実誤認' :
                        selectedReport.category === 'minor_error' ? '軽微な誤り' : '改善提案'
                    }</span>
                  </p>
                </div>

                <div className={styles.detailGroup}>
                  <label>指摘説明</label>
                  <div className={styles.detailBox}>
                    {selectedReport.description}
                  </div>
                </div>

                <div className={styles.detailGroup}>
                  <label>報告者</label>
                  <p>{selectedReport.reporter_nickname || '匿名'} (報告日: {new Date(selectedReport.created_at).toLocaleDateString()})</p>
                </div>

                {/* --- 指摘対象のコンテンツ内容 --- */}
                {selectedContent ? (
                  <div className={styles.detailGroup}>
                    <label>対象コンテンツの内容</label>
                    <div className={styles.detailBox}>
                      <h4>{selectedContent.title}</h4>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{selectedContent.content}</p>
                      {/* TODO: 選択肢の表示 */}
                    </div>
                  </div>
                ) : <p>コンテンツを読み込み中...</p>}

                <div className={styles.detailGroup}>
                  <label htmlFor="resolution_note">対応メモ (任意)</label>
                  <textarea
                    id="resolution_note"
                    placeholder="対応内容や修正内容をメモできます"
                    className={styles.memoTextarea}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                </div>

                <div className={styles.detailActions}>
                  {/* ★★★ 修正 ★★★ */}
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => handleUpdateStatus('rejected')}
                  >
                    <img src={iconReject} alt="" className={`${styles.buttonIcon} ${styles.buttonIconDark}`} />
                    却下
                  </button>
                  <button
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    onClick={() => handleUpdateStatus('resolved')}
                  >
                    <img src={iconCheckmark} alt="" className={`${styles.buttonIcon} ${styles.buttonIconLight}`} />
                    対応済みにする
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </main>

      {/* --- フッター（スマホ用） --- */}
      <footer className={styles.mobileFooter}>
        <Link to="/teacher/dashboard" className={styles.mobileNavButton}>
          <img src={iconDashboard} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ダッシュボード</span>
        </Link>
        <Link to="/teacher/teams" className={styles.mobileNavButton}>
          <img src={iconTeam} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>チーム管理</span>
        </Link>
        <button className={styles.mobileNavButtonActive}>
          <img src={iconFlag} alt="" className={styles.navIconMobile} />
          <span>指摘管理</span>
        </button>
        <button onClick={handleLogout} className={styles.mobileNavButton}>
          <img src={iconLogout} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ログアウト</span>
        </button>
      </footer>
    </div>
  );
};

export default Correction;