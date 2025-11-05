// このファイルは src/pages/student/MyPage/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './MyPage.module.css';

const MyPage = () => {
  return (
    <div className={styles.container}>
      <h1>マイページ</h1>
      <p>（ここに学習統計や、投稿・解答・いいね・保存履歴が表示されます）</p>
      <a href="/home">ホームに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトエクスポート ★★★
export default MyPage;
