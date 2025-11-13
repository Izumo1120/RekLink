// このファイルは src/components/features/quiz/ フォルダに配置してください。
import { useNavigate } from 'react-router-dom';
import styles from './QuizCard.module.css';

// いいね・保存アイコン（ダミー）
// TODO: lucide-react をインストール (npm install lucide-react) するか、画像アセットに差し替えてください


import Heart from '@assets/icons/heart.png';
import Bookmark from '@assets/icons/bookmark.png';
import Flag from '@assets/icons/flag.png';

// Home.tsx から Quiz または Trivia の型を受け取る
type ContentItem = Quiz | Trivia;

interface QuizCardProps {
  item: ContentItem;
}

const QuizCard = ({ item }: QuizCardProps) => {
  const navigate = useNavigate();

  // カードがクリックされたときの処理
  const handleCardClick = () => {
    if (item.content_type === 'quiz') {
      navigate(`/quiz/${item.id}`);
    } else {
      // TODO: 豆知識詳細ページへの遷移
      // navigate(`/trivia/${item.id}`);
      console.log("豆知識カードがクリックされました:", item.id);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation(); // カード本体へのクリックイベントを防ぐ
    navigate(`/search?tag=${tagName}`); // TODO: 検索ページへの遷移
  };

  const handleInteraction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    // TODO: POST /api/v1/contents/{id}/like などのAPIを呼び出す
    console.log(`${action} a ${item.id}`);
  };

  return (
    <div className={styles.card} onClick={handleCardClick}>
      <div className={styles.cardHeader}>
        <div className={styles.contentType}>
          {/* TODO: 投稿者のアバター画像 */}
          <span className={`${styles.badge} ${item.content_type === 'quiz' ? styles.quizBadge : styles.triviaBadge}`}>
            {item.content_type === 'quiz' ? 'クイズ' : '豆知識'}
          </span>
        </div>
        <span className={styles.authorName}>{item.author_id.substring(0, 8)}...</span> {/* 匿名表示 (仕様書通り) */}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.content}>{item.content}</p>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => ( // 最大3つまで表示
            <button key={index} className={styles.tag} onClick={(e) => handleTagClick(e, tag.name)}>
              # {tag.name}
            </button>
          ))}
        </div>

        {/* 解答/詳細ボタン */}
        {item.content_type === 'quiz' ? (
          <button className={styles.actionButton}>解答する</button>
        ) : (
          <button className={styles.actionButton}>詳細を見る</button>
        )}
      </div>

      <div className={styles.interactions}>
        <button onClick={(e) => handleInteraction(e, 'like')}>
          <img src={Heart} alt="like" width={18} height={18} /> <span>0</span>
        </button>
        <button onClick={(e) => handleInteraction(e, 'save')}>
          <img src={Bookmark} alt="save" width={18} height={18} /> <span>0</span>
        </button>
        <button onClick={(e) => handleInteraction(e, 'report')}>
          <img src={Flag} alt="report" width={18} height={18} />
        </button>
      </div>
    </div>
  );
};

export default QuizCard;