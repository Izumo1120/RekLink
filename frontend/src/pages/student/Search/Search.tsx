// このファイルは src/pages/student/Search/ フォルダに配置してください。
// App.tsx の 'export default' がないというエラーを解消するためのダミーファイルです。

import styles from './Search.module.css';

const Search = () => {
  return (
    <div className={styles.container}>
      <h1>検索結果ページ</h1>
      <p>（ここにクイズや豆知識の検索結果が一覧表示されます）</p>
      <a href="/home">ホームに戻る</a>
    </div>
  );
};

// ★★★ エラー解消のためのデフォルトクスポート ★★★
export default Search;
