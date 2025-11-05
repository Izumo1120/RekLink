// このファイルは src/pages/student/QuizDetail/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './QuizDetail.module.css';
// import { useParams } from 'react-router-dom'; // URLからIDを取得するために将来的に使用

const QuizDetail = () => {
  // const { id } = useParams(); // URLからクイズのIDを取得

  return (
    <div className={styles.container}>
      {/* <h1>クイズ詳細ページ (ID: {id})</h1> */}
      <h1>クイズ詳細ページ</h1>
      <p>（ここにクイズの問題文と選択肢が表示され、解答できます）</p>
      <a href="/home">ホームに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトクスポート ★★★
export default QuizDetail;
