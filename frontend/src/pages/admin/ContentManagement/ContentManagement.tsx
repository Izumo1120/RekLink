// このファイルは src/pages/admin/ContentManagement/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './ContentManagement.module.css';

const ContentManagement = () => {
  return (
    <div className={styles.container}>
      <h1>管理者用：コンテンツ管理ページ</h1>
      <p>（ここに不適切投稿の削除など、管理者用フォームが入ります）</p>
      <a href="/teacher/dashboard">ダッシュボードに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトエクスポート ★★★
export default ContentManagement;
