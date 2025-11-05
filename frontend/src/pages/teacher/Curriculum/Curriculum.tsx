// このファイルは src/pages/teacher/Curriculum/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './Curriculum.module.css';

const Curriculum = () => {
  return (
    <div className={styles.container}>
      <h1>教師用：教科書連携（試験範囲）設定ページ</h1>
      <p>（ここに試験範囲と関連タグを設定するフォームが入ります）</p>
      <a href="/teacher/dashboard">ダッシュボードに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトエクスポート ★★★
export default Curriculum;
