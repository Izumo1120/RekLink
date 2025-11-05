// このファイルは src/pages/student/ContentCreate/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './ContentCreate.module.css';

const ContentCreate = () => {
  return (
    <div className={styles.container}>
      <h1>コンテンツ作成ページ</h1>
      <p>（ここにクイズや豆知識の作成フォームが入ります）</p>
      <a href="/home">ホームに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトエクスポート ★★★
export default ContentCreate;
