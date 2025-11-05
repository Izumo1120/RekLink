// このファイルは src/pages/admin/StudentUpload/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './StudentUpload.module.css';

const StudentUpload = () => {
  return (
    <div className={styles.container}>
      <h1>管理者用：生徒一括登録ページ</h1>
      <p>（ここにCSVファイルをアップロードするフォームが入ります）</p>
      <a href="/admin/teachers">管理者トップに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトクスポート ★★★
export default StudentUpload;
