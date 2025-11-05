"use client";

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Signup.module.css';

// 以前作成したAPIクライアントとストアをインポート
import { registerUser } from '@lib/api'; // (api.ts に registerUser を追加します)
import { useUserStore } from '@store/userStore';

// --- アイコンのアセット ---
// ※デザイン画像にある「卒業帽」「教師」アイコンがアップロードされていないため、
//   既存のアセットで仮置きしています。
import logoBook from '@assets/icons/note-1.png';
import iconStudent from '@assets/icons/note-1.png'; // 仮: note-1.png
import iconTeacher from '@assets/icons/people-1.png'; // 仮: people-1.png

const Signup = () => {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const loginToStore = useUserStore((state) => state.login);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // --- フロントエンド バリデーション ---
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }
    if (!nickname) {
      setError('ニックネームを入力してください。');
      return;
    }

    setIsLoading(true);

    try {
      // 1. バックエンドの登録APIを呼び出す (api.ts で後ほど作成)
      const newUser = await registerUser({
        email,
        password,
        nickname,
        role,
      });

      // 2. 登録成功後、そのまま自動ログインさせる
      // (register APIはユーザー情報を返すので、トークンは別途login APIで取得する)
      // const tokenData = await loginUser(email, password); // api.ts に既に実装済み

      // 3. グローバルストアに保存
      // loginToStore(tokenData.access_token, newUser);

      // 4. 登録完了アラートとページ遷移
      // (ここではダミーのログイン成功として扱います)
      alert(`登録が完了しました。\n${role === 'student' ? '生徒' : '教師'}としてログインします。`);

      // TODO: 上記の自動ログイン処理を実装する
      // (実装するまでは、手動でログインページにリダイレクト)
      navigate('/login');

    } catch (err: any) {
      // エラーハンドリング
      console.error('登録失敗:', err);
      setError(err.message || '登録に失敗しました。メールアドレスが既に使用されている可能性があります。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.signupPageWrapper}>
      <div className={styles.signupContainer}>

        {/* --- カードヘッダー --- */}
        <div className={styles.cardHeader}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#2E7D32" />
            </svg>
            <span>戻る</span>
          </button>
        </div>

        {/* --- フォーム本体 --- */}
        <form onSubmit={handleSubmit} className={styles.signupForm}>
          <div className={styles.formTitle}>
            <img src={logoBook} alt="新規登録" />
            <h2>新規登録</h2>
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          {/* --- アカウント種別 --- */}
          <div className={styles.formGroup}>
            <label>アカウント種別</label>
            <div className={styles.roleSelection}>
              <button
                type="button"
                className={`${styles.roleOption} ${role === 'student' ? styles.selected : ''}`}
                onClick={() => setRole('student')}
              >
                <img src={iconStudent} alt="生徒" />
                <span>生徒</span>
                <small>学習コンテンツを作成・共有</small>
              </button>
              <button
                type="button"
                className={`${styles.roleOption} ${role === 'teacher' ? styles.selected : ''}`}
                onClick={() => setRole('teacher')}
              >
                <img src={iconTeacher} alt="教師" />
                <span>教師</span>
                <small>チームを管理・指導</small>
              </button>
            </div>
          </div>

          {/* --- 入力フォーム --- */}
          <div className={styles.formGroup}>
            <label htmlFor="nickname">ニックネーム</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="学習 太郎"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上で入力"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">パスワード（確認）</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワードを再入力"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? '登録中...' : '登録する'}
          </button>

          <p className={styles.loginLink}>
            すでにアカウントをお持ちの方は{' '}
            <Link to="/login">ログイン</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;

