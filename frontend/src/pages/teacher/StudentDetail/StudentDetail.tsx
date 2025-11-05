// このファイルは src/pages/teacher/StudentDetail/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './StudentDetail.module.css';
// import { useParams } from 'react-router-dom'; // URLからIDを取得するために将来的に使用

const StudentDetail = () => {
  // const { id } = useParams(); // URLから生徒のIDを取得

  return (
    <div className={styles.container}>
      {/* <h1>生徒詳細ページ (ID: {id})</h1> */}
      <h1>生徒詳細ページ</h1>
      <p>（ここに特定の生徒のプロフィール、学習統計、活動履歴が表示されます）</p>
      <a href="/teacher/dashboard">ダッシュボードに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトクスポート ★★★
export default StudentDetail;
