// このファイルは src/pages/teacher/TeamManagement/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './TeamManagement.module.css';

const TeamManagement = () => {
  return (
    <div className={styles.container}>
      <h1>教師用：チーム管理ページ</h1>
      <p>（ここに自身が管理するチームの一覧や、新規チーム作成フォームが入ります）</p>
      <a href="/teacher/dashboard">ダッシュボードに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトクスポート ★★★
export default TeamManagement;
