// このファイルは src/pages/student/ContentCreate/ フォルダに配置してください。
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './ContentCreate.module.css';

// ストアとAPIクライアント
import { useUserStore } from '@store/userStore';
import { createQuiz, createTrivia } from '@lib/api';

// --- アイコンのアセット ---
import iconBrain from '@assets/icons/brain.png'; // ★ 緑色の脳
import iconBook from '@assets/icons/note-1.png'; // ★ 緑色の本
import iconHome from '@assets/icons/icon-dashboard-active.png';
import iconMyPage from '@assets/icons/people-1.png';
// (フッターナビゲーション用)
// import iconHomeActive from '@assets/icons/icon-dashboard-active.png';

import logoBook from '@assets/icons/note-1.png';

type ContentType = 'quiz' | 'trivia';

// クイズ選択肢の初期状態
// const initialOption = { option_text: '', is_correct: false };

const ContentCreate = () => {
  const navigate = useNavigate();

  // --- 認証状態の取得 ---
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());

  // --- フォームの状態管理 ---
  const [contentType, setContentType] = useState<ContentType>('quiz');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // 問題文 または 内容
  const [explanation, setExplanation] = useState(''); // 解説（任意）

  // クイズ専用
  const [options, setOptions] = useState<QuizOptionCreate[]>([
    { option_text: '', is_correct: true }, // 1つ目はデフォルトで正解
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

  // タグ専用
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);

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
  }, [isAuthenticated, user, token, navigate]);

  // --- クイズ選択肢ハンドラ ---
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].option_text = value;
    setOptions(newOptions);
  };

  const handleCorrectOptionChange = (index: number) => {
    const newOptions = options.map((option, i) => ({
      ...option,
      is_correct: i === index, // ラジオボタンなので、選択したものだけ true
    }));
    setOptions(newOptions);
  };

  // --- タグハンドラ ---
  const handleAddTag = () => {
    if (currentTag && !tags.includes(currentTag) && tags.length < 5) {
      setTags([...tags, currentTag]);
      setCurrentTag('');
    }
  };
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // --- フォーム送信 ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError(null);
    setIsLoading(true);

    try {
      if (contentType === 'quiz') {
        // クイズのバリデーション
        if (options.some(opt => !opt.option_text)) {
          throw new Error('すべての選択肢を入力してください。');
        }
        if (!options.some(opt => opt.is_correct)) {
          throw new Error('正解の選択肢を1つ選択してください。');
        }

        const quizData: QuizCreate = { title, content, explanation, options, tags };
        await createQuiz(token, quizData);

      } else {
        // 豆知識のバリデーション
        const triviaData: TriviaCreate = { title, content, explanation, tags };
        await createTrivia(token, triviaData);
      }

      alert('投稿が完了しました！');
      navigate('/home'); // ホームフィードに戻る

    } catch (err: any) {
      console.error('投稿失敗:', err);
      setError(err.message || '投稿に失敗しました。');
    } finally {
      setIsLoading(false);
    }
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
          <button className={styles.navButtonActive}>
            <svg className={styles.navIcon} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4.16669V15.8334M4.16669 10H15.8334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>投稿作成</span>
          </button>
          <Link to="/mypage" className={styles.navButton}>
            <img src={iconMyPage} alt="" className={`${styles.navIcon} ${styles.navIconInactive}`} />
            <span>マイページ</span>
          </Link>
          {/* ... ログアウトボタン ... */}
        </nav>
      </header>

      {/* --- メインコンテンツ --- */}
      <main className={styles.mainContainer}>
        <div className={styles.pageTitle}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#2E7D32" /></svg>
            <span>戻る</span>
          </button>
          <h2>新規投稿</h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContainer}>

          {error && <p className={styles.errorMessage}>{error}</p>}

          {/* --- 投稿タイプ --- */}
          <div className={styles.formGroup}>
            <label>投稿タイプ</label>
            <div className={styles.roleSelection}>
              <button
                type="button"
                className={`${styles.roleOption} ${contentType === 'quiz' ? styles.selected : ''}`}
                onClick={() => setContentType('quiz')}
              >
                <img src={iconBrain} alt="クイズ" />
                <span>クイズ</span>
              </button>
              <button
                type="button"
                className={`${styles.roleOption} ${contentType === 'trivia' ? styles.selected : ''}`}
                onClick={() => setContentType('trivia')}
              >
                <img src={iconBook} alt="豆知識" />
                <span>豆知識</span>
              </button>
            </div>
          </div>

          {/* --- 共通フォーム --- */}
          <div className={styles.formGroup}>
            <label htmlFor="title">タイトル</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="わかりやすいタイトルを入力"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="content">
              {contentType === 'quiz' ? '問題文' : '内容'}
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={contentType === 'quiz' ? 'クイズの問題文を入力' : '豆知識の内容を入力'}
              rows={5}
              required
              disabled={isLoading}
            />
          </div>

          {/* --- クイズ専用フォーム --- */}
          {contentType === 'quiz' && (
            <div className={styles.quizOptions}>
              <label>選択肢</label>
              {options.map((option, index) => (
                <div key={index} className={styles.optionInput}>
                  <input
                    type="radio"
                    name="correct_option"
                    id={`option_${index}`}
                    checked={option.is_correct}
                    onChange={() => handleCorrectOptionChange(index)}
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    aria-label={`選択肢 ${index + 1}`}
                    value={option.option_text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`選択肢 ${index + 1}`}
                    required
                    disabled={isLoading}
                  />
                </div>
              ))}
              <small>※ ラジオボタンで正解を選択してください</small>
            </div>
          )}

          {/* --- タグ入力 --- */}
          <div className={styles.formGroup}>
            <label htmlFor="tag">タグ</label>
            <div className={styles.tagInput}>
              <input
                type="text"
                id="tag"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="タグを入力 (例: 歴史)"
                disabled={isLoading}
              />
              <button type="button" onClick={handleAddTag} disabled={isLoading || !currentTag}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4.16669V15.8334M4.16669 10H15.8334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className={styles.tagList}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
            </div>
            <div className={styles.suggestedTags}>
              <small>おすすめタグ:</small>
              {['歴史', '理科', '数学', '英語', '国語', '地理'].map(tag => (
                <button
                  type="button"
                  key={tag}
                  className={styles.suggestTag}
                  onClick={() => {
                    if (!tags.includes(tag)) setTags([...tags, tag]);
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* --- 解説（任意） --- */}
          <div className={styles.formGroup}>
            <label htmlFor="explanation">解説 (任意)</label>
            <textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="クイズの解説や豆知識の補足情報を入力"
              rows={3}
              disabled={isLoading}
            />
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
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isLoading}
            >
              {isLoading ? '投稿中...' : '投稿する'}
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
        <button className={styles.mobileNavButtonActive}>
          <div className={styles.createButton}>
            <svg className={`${styles.navIconMobile} ${styles.navIconPlus}`} width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4.16669V15.8334M4.16669 10H15.8334" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span>投稿</span>
        </button>
        <Link to="/mypage" className={styles.mobileNavButton}>
          <img src={iconMyPage} alt="" className={`${styles.navIconMobile} ${styles.navIconInactiveMobile}`} />
          <span>マイページ</span>
        </Link>
      </footer>
    </div>
  );
};

export default ContentCreate;