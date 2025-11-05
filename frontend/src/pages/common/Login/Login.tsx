import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.css';

// 以前作成したAPIクライアントとストアをインポート
import { loginUser, getMe } from '@lib/api';
import { useUserStore } from '@store/userStore';

// ランディングページから流用するアイコン
import logoBook from '@assets/icons/note-1.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const loginToStore = useUserStore((state) => state.login); // ストアのloginアクションを取得

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. バリデーション
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください。');
      }

      // 2. バックエンドのログインAPIを呼び出す
      const tokenData = await loginUser(email, password);

      // 3. 受け取ったトークンを使って、自分のユーザー情報を取得
      const userData = await getMe(tokenData.access_token);

      // 4. グローバルストアにトークンとユーザー情報を保存
      loginToStore(tokenData.access_token, userData);

      // 5. ユーザーの役割（role）に応じて適切なページにリダイレクト
      if (userData.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (userData.role === 'admin') {
        navigate('/admin/teachers'); // 仮
      } else {
        navigate('/home'); // 生徒のホーム
      }

    } catch (err: any) {
      // エラーハンドリング
      console.error('ログイン失敗:', err);
      setError(err.message || 'メールアドレスまたはパスワードが正しくありません。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPageWrapper}>
      <div className={styles.loginContainer}>

        {/* --- カードヘッダー --- */}
        <div className={styles.cardHeader}>
          {/* 「戻る」ボタン */}
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#2E7D32" />
            </svg>
            <span>戻る</span>
          </button>
        </div>

        {/* --- フォーム本体 --- */}
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formTitle}>
            <img src={logoBook} alt="ログイン" />
            <h2>ログイン</h2>
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

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
              placeholder="パスワードを入力"
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? '処理中...' : 'ログイン'}
          </button>

          <p className={styles.signupLink}>
            アカウントをお持ちでない方は{' '}
            <Link to="/signup">新規登録</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;

