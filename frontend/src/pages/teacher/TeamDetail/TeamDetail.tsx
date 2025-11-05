// このファイルは src/pages/teacher/TeamDetail/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './TeamDetail.module.css';
// import { useParams } from 'react-router-dom'; // URLからIDを取得するために将来的に使用

const TeamDetail = () => {
  // const { id } = useParams(); // URLからチームのIDを取得

  return (
    <div className={styles.container}>
      {/* <h1>チーム詳細ページ (ID: {id})</h1> */}
      <h1>チーム詳細ページ</h1>
      <p>（ここにチームの参加コードや、所属する生徒の一覧が表示されます）</p>
      <a href="/teacher/dashboard">ダッシュボードに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトクスポート ★★★
export default TeamDetail;
