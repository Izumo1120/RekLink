// このファイルは src/pages/student/QuizDetail/ フォルダに配置してください。
"use client";

import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import styles from './QuizDetail.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { getQuizDetail, getTriviaDetail, submitQuizAnswer } from '@lib/api';

// --- アイコンのアセット ---
import iconArrowLeft from '@assets/icons/icon-arrow-left.png';
import iconHeart from '@assets/icons/heart.png';
import iconBookmark from '@assets/icons/bookmark.png';
import iconFlag from '@assets/icons/flag.png';
import iconHome from '@assets/icons/icon-dashboard-inactive.png';
import iconBook from '@assets/icons/note-1.png';
import iconMyPage from '@assets/icons/people-1.png';
import iconHomeActive from '@assets/icons/icon-dashboard-active.png';
import logoBook from '@assets/icons/note-1.png';
import iconLogout from '@assets/icons/icon-logout.png';
// import iconHomeActive from '@assets/icons/icon-dashboard-active.png';

// 正解・不正解アイコン (SVG)
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 5L5 15M5 5L15 15" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


const QuizDetail = () => {
  const navigate = useNavigate();
  const { id: contentId } = useParams(); // URLからコンテンツIDを取得
  const location = useLocation();

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);

  // --- 画面の状態管理 ---
  const [status, setStatus] = useState<'loading' | 'ready' | 'answered' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<Quiz | Trivia | null>(null);

  // クイズ専用
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 認証ガード & 初期データ取得 ---
  useEffect(() => {
    if (!contentId) {
      setError('コンテンツIDが見つかりません。');
      setStatus('error');
      return;
    }

    const fetchData = async () => {
      try {
        setStatus('loading');

        // ★ 呼び分けロジック ★
        // URLパス (`/quiz/` or `/trivia/`) に基づいてAPIを呼び分ける
        let data;
        if (location.pathname.startsWith('/quiz/')) {
          data = await getQuizDetail(contentId);
        } else if (location.pathname.startsWith('/trivia/')) {
          data = await getTriviaDetail(contentId);
        } else {
          // 念のため、/quiz/ から来たものとしてフォールバック
          data = await getQuizDetail(contentId);
        }

        setContent(data);
        setStatus('ready');
      } catch (err: any) {
        setError(err.message || 'コンテンツの読み込みに失敗しました。');
        setStatus('error');
      }
    };
    fetchData();
  }, [contentId, location.pathname]);

  // --- 解答送信 ---
  const handleSubmitAnswer = async () => {
    if (!token) {
      alert('クイズに解答するにはログインが必要です。');
      navigate('/login');
      return;
    }
    if (!contentId || !selectedOptionId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitQuizAnswer(token, contentId, selectedOptionId);
      setAnswerResult(result);
      setStatus('answered'); // 解答済み状態に
    } catch (err: any) {
      setError(err.message || '解答の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 選択肢のスタイルを決定するヘルパー ---
  const getOptionStyle = (optionId: string) => {
    if (status !== 'answered' || !answerResult) {
      // 未解答時
      return selectedOptionId === optionId ? styles.optionSelected : styles.option;
    }

    // 解答済み時
    if (answerResult.is_correct && optionId === selectedOptionId) {
      return styles.optionCorrect; // 正解
    }
    if (!answerResult.is_correct && optionId === selectedOptionId) {
      return styles.optionIncorrect; // 選択した不正解
    }
    if (optionId === answerResult.correct_option_id) {
      return styles.optionCorrect; // 正解（ハイライト）
    }
    return styles.option; // その他
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- レンダリング ---

  if (status === 'loading') {
    return <div className={styles.loadingScreen}>読み込み中...</div>;
  }

  if (status === 'error' || !content) {
    return <div className={styles.loadingScreen}>エラー: {error || 'コンテンツデータが見つかりません'}</div>;
  }

  const isQuiz = content.content_type === 'quiz';
  const quiz = isQuiz ? (content as Quiz) : null;
  const trivia = !isQuiz ? (content as Trivia) : null;

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
            <img src={iconHomeActive} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} /> {/* 家アイコン（非アクティブ） */}
            <span>ホーム</span>
          </Link>
          <button className={styles.navButtonActive}>
            <img src={iconBook} alt="" className={styles.navIcon} /> {/* 学習アイコン（アクティブ） */}
            <span>学習コンテンツ</span>
          </button>
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

        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <span className={`${styles.badge} ${isQuiz ? styles.quizBadge : styles.triviaBadge}`}>
              {isQuiz ? 'クイズ' : '豆知識'}
            </span>
            <span className={styles.authorName}>（匿名ユーザー）</span>
          </div>

          <div className={styles.cardBody}>
            <h2 className={styles.title}>{content.title}</h2>
            <p className={styles.content}>{content.content}</p>

            {/* --- クイズ選択肢 --- */}
            {isQuiz && quiz && (
              <div className={styles.optionsContainer}>
                <label>選択肢</label>
                {quiz.options.map(option => (
                  <button
                    key={option.id}
                    className={getOptionStyle(option.id)}
                    onClick={() => status !== 'answered' && setSelectedOptionId(option.id)}
                    disabled={status === 'answered' || isSubmitting}
                  >
                    <span>{option.option_text}</span>
                    {/* 解答後の正解/不正解アイコン */}
                    {status === 'answered' && answerResult && option.id === answerResult.correct_option_id && <CheckIcon />}
                    {status === 'answered' && answerResult && !answerResult.is_correct && option.id === selectedOptionId && <XIcon />}
                  </button>
                ))}
              </div>
            )}

            {/* --- 解答ボタン / 結果表示 --- */}
            {isQuiz && status === 'ready' && (
              <button
                className={styles.submitButton}
                onClick={handleSubmitAnswer}
                disabled={!selectedOptionId || isSubmitting}
              >
                {isSubmitting ? '解答中...' : '解答する'}
              </button>
            )}

            {status === 'answered' && answerResult && (
              <div className={answerResult.is_correct ? styles.resultCorrect : styles.resultIncorrect}>
                {answerResult.is_correct ? '正解です！' : '残念、不正解です。'}
              </div>
            )}

            {/* --- 解説 --- */}
            {status === 'answered' && answerResult?.explanation && (
              <div className={styles.explanationBox}>
                <label>解説</label>
                <p>{answerResult.explanation}</p>
              </div>
            )}

            {/* --- 豆知識（解説のみ） --- */}
            {!isQuiz && trivia && trivia.explanation && (
              <div className={styles.explanationBox}>
                <label>補足・解説</label>
                <p>{trivia.explanation}</p>
              </div>
            )}

            {/* --- タグ --- */}
            <div className={styles.tagsArea}>
              <label>タグ</label>
              <div className={styles.tagsContainer}>
                {content.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>
                    # {tag.name}
                  </span>
                ))}
              </div>
            </div>

            {/* --- インタラクション --- */}
            <div className={styles.interactions}>
              <button>
                <img src={iconHeart} alt="いいね" /> <span>0</span>
              </button>
              <button>
                <img src={iconBookmark} alt="保存" /> <span>0</span>
              </button>
              <Link to={`/report/${content.id}`} className={styles.reportLink}>
                <img src={iconFlag} alt="指摘する" />
                <span>指摘する</span>
              </Link>
            </div>

          </div>
        </div>

      </main>

      {/* --- フッター（スマホ用） --- */}
      <footer className={styles.mobileFooter}>
        <Link to="/home" className={styles.mobileNavButton}>
          <img src={iconHome} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>ホーム</span>
        </Link>
        <button className={styles.mobileNavButtonActive}>
          <img src={iconBook} alt="" className={styles.navIconMobile} />
          <span>学習</span>
        </button>
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

export default QuizDetail;