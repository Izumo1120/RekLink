// このファイルは src/pages/student/Report/ フォルダに配置してください。
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import styles from './Report.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { createReport } from '@lib/api';

// --- アイコンのアセット ---
import logoBook from '@assets/icons/note-1.png';
import iconHome from '@assets/icons/icon-dashboard-inactive.png';
import iconBook from '@assets/icons/note-1.png';
import iconMyPage from '@assets/icons/people-1.png';
import iconLogout from '@assets/icons/icon-logout.png';
import iconArrowLeft from '@assets/icons/icon-arrow-left.png';
import iconAlert from '@assets/icons/icon-alert-danger.png'; // 警告アイコン

const Report = () => {
  const navigate = useNavigate();
  const { id: contentId } = useParams(); // URLから指摘対象のコンテンツIDを取得

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- フォームの状態管理 ---
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');

  // API通信状態
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- 認証ガード ---
  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      navigate('/login');
    }
    if (user && user.role !== 'student') {
      navigate('/teacher/dashboard'); // 教師はダッシュボードへ
    }
    if (!contentId) {
      setError('指摘対象のコンテンツIDが見つかりません。');
    }
  }, [isAuthenticated, user, token, navigate, contentId]);

  // --- フォーム送信 ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !contentId) return;

    setError(null);

    // --- フロントエンド バリデーション ---
    if (!category) {
      setError('指摘の種類を選択してください。');
      return;
    }
    if (description.length < 10) {
      setError('詳細な説明を10文字以上で入力してください。');
      return;
    }

    setIsLoading(true);

    try {
      const reportData: ReportCreate = {
        content_id: contentId,
        category: category,
        description: description,
      };

      await createReport(token, reportData);

      alert('指摘が送信されました。\nご協力ありがとうございます。');
      navigate(-1); // 前の画面（クイズ詳細など）に戻る

    } catch (err: any) {
      console.error('指摘の送信失敗:', err);
      setError(err.message || '指摘の送信に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- レンダリング ---
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
          <Link to="/mypage" className={styles.navButton}>
            <img src={iconMyPage} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>マイページ</span>
          </Link>
          <button onClick={handleLogout} className={styles.navButton}>
            <img src={iconLogout} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>ログアウト</span>
          </button>
        </nav>
      </header>

      {/* --- メインコンテンツ --- */}
      <main className={styles.mainContainer}>
        <div className={styles.pageTitle}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <img src={iconArrowLeft} alt="戻る" className={styles.backButtonIcon} />
            <span>戻る</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContainer}>

          <div className={styles.formHeader}>
            <img src={iconAlert} alt="警告" />
            <h3>コンテンツの指摘</h3>
          </div>

          <div className={styles.alertMessage}>
            コンテンツに誤りや不適切な内容がある場合、こちらから報告できます。投稿者と教師に通知され、改善に役立てられます。
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          {/* --- 指摘の種類 --- */}
          <div className={styles.formGroup}>
            <label>指摘の種類</label>
            <div className={styles.categoryGrid}>
              <button
                type="button"
                className={`${styles.categoryOption} ${category === 'major_error' ? styles.selected : ''}`}
                onClick={() => setCategory('major_error')}
              >
                <span>事実誤認</span>
                <small>事実や年号に誤りがある</small>
              </button>
              <button
                type="button"
                className={`${styles.categoryOption} ${category === 'minor_error' ? styles.selected : ''}`}
                onClick={() => setCategory('minor_error')}
              >
                <span>文法・表現</span>
                <small>誤字脱字や表現に問題がある</small>
              </button>
              <button
                type="button"
                className={`${styles.categoryOption} ${category === 'improvement' ? styles.selected : ''}`}
                onClick={() => setCategory('improvement')}
              >
                <span>不適切な内容</span>
                <small>不適切な内容が含まれる</small>
              </button>
              <button
                type="button"
                className={`${styles.categoryOption} ${category === 'other' ? styles.selected : ''}`} // 'other' は 'improvement' として扱う
                onClick={() => setCategory('improvement')} // 仮
              >
                <span>その他</span>
                <small>その他の問題</small>
              </button>
            </div>
          </div>

          {/* --- 詳細な説明 --- */}
          <div className={styles.formGroup}>
            <label htmlFor="description">詳細な説明</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="どのような問題があるか、具体的に説明してください"
              rows={6}
              required
              minLength={10}
              disabled={isLoading}
            />
            <small>より詳しく説明することで、改善がスムーズになります。</small>
          </div>

          {/* --- 送信ボタン --- */}
          <div className={styles.formActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => navigate(-1)} // 戻る
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonDanger}`}
              disabled={isLoading || !category}
            >
              {isLoading ? '送信中...' : '指摘を送信'}
            </button>
          </div>

        </form>

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
        <Link to="/mypage" className={styles.mobileNavButton}>
          <img src={iconMyPage} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>マイページ</span>
        </Link>
      </footer>
    </div>
  );
};

export default Report;