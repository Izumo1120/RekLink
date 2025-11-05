import { Link, useNavigate } from 'react-router-dom';
import styles from './Landing.module.css'; // Canvasで開かれているCSS Modules

// --- 必要なアセット（画像・アイコン）をインポート ---
// （src/assets/ フォルダに配置されていることを想定）

// メインロゴ
import logoBook from '@assets/icons/note-1.png'; 

// カード用アイコン
import iconQuiz from '@assets/icons/note-1.png';
import iconTeam from '@assets/icons/people-1.png';
import iconReport from '@assets/icons/achieve-2.png';
import iconAnalytics from '@assets/icons/graph-1.png';

// メインビジュアル
import mainVisual from '@assets/images/hero-image.jpg'; // 先ほど選定した画像

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.landingContainer}>
      
      {/* --- ヘッダーセクション --- */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src={logoBook} alt="RekLink Logo" />
          <h1>RekLink</h1>
        </div>
        <nav className={styles.navigation}>
          <button 
            className={styles.navButtonSecondary} 
            onClick={() => navigate('/login')}
          >
            ログイン
          </button>
          <button 
            className={styles.navButtonPrimary} 
            onClick={() => navigate('/signup')}
          >
            新規登録
          </button>
        </nav>
      </header>

      {/* --- メインビジュアル & キャッチコピー --- */}
      <section className={styles.heroSection}>
        <div className={styles.heroText}>
          <h2>温故知新 Learning</h2>
          <p>歴史から学び、新しい知識を創造する。</p>
          <p>生徒と教師が協力して学びを深める、探究型学習プラットフォーム。</p>
        </div>
        <div className={styles.heroImageContainer}>
          <img src={mainVisual} alt="歴史の書棚" className={styles.heroImage} />
        </div>
      </section>

      {/* --- 機能紹介カードセクション --- */}
      <section className={styles.featuresSection}>
        
        {/* クイズと豆知識 ( /quizzes へリンク) */}
        <Link to="/quizzes" className={`${styles.featureCard} ${styles.cardLink}`}>
          <div className={styles.cardIcon}>
            <img src={iconQuiz} alt="クイズと豆知識" />
          </div>
          <h3>クイズと豆知識</h3>
          <p>楽しく学べるコンテンツを自由に作成・共有</p>
        </Link>

        {/* チーム学習 (ホバーエフェクトのみ) */}
        <div className={styles.featureCard}>
          <div className={styles.cardIcon}>
            <img src={iconTeam} alt="チーム学習" />
          </div>
          <h3>チーム学習</h3>
          <p>クラスメイトと一緒に学習を進める</p>
        </div>

        {/* 誤り指摘機能 (ホバーエフェクトのみ) */}
        <div className={styles.featureCard}>
          <div className={styles.cardIcon}>
            <img src={iconReport} alt="誤り指摘機能" />
          </div>
          <h3>誤り指摘機能</h3>
          <p>コンテンツの質を高める協力体制</p>
        </div>

        {/* 学習分析 (ホバーエフェクトのみ) */}
        <div className={styles.featureCard}>
          <div className={styles.cardIcon}>
            <img src={iconAnalytics} alt="学習分析" />
          </div>
          <h3>学習分析</h3>
          <p>進捗を可視化して効果的な学習をサポート</p>
        </div>
      </section>

      {/* --- 学習の流れセクション --- */}
      <section className={styles.howToSection}>
        <h2>学習の流れ</h2>
        <div className={styles.stepsContainer}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>登録・参加</h3>
            <p>アカウントを作成し、チームに参加します</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>学習・投稿</h3>
            <p>クイズを解いたり、豆知識を投稿します</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>協力・成長</h3>
            <p>互いに学び合い、知識を深めます</p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Landing;

