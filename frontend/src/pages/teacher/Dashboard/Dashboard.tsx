// このファイルは src/pages/teacher/Dashboard/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './Dashboard.module.css';

const Dashboard = () => {
  return (
    <div className={styles.container}>
      <h1>教師用：ダッシュボード</h1>
      <p>（ここにクラス全体の学習サマリーや、未対応の指摘一覧が表示されます）</p>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトエクスポート ★★★
export default Dashboard;
