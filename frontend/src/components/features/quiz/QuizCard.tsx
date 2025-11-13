// このファイルは src/components/features/quiz/ フォルダに配置してください。
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './QuizCard.module.css';
import { useUserStore } from '@store/userStore';
import { likeContent, unlikeContent, saveContent, unsaveContent } from '@lib/api';

import Heart from '@assets/icons/heart.png';
import Bookmark from '@assets/icons/bookmark.png';
import Flag from '@assets/icons/flag.png';

// Home.tsx から Quiz または Trivia の型を受け取る
type ContentItem = Quiz | Trivia;

interface QuizCardProps {
  item: ContentItem;
  onUpdate?: () => void; // いいね・保存後にリストを更新するためのコールバック
}

const QuizCard = ({ item, onUpdate }: QuizCardProps) => {
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // カードがクリックされたときの処理
  const handleCardClick = () => {
    if (item.content_type === 'quiz') {
      navigate(`/quiz/${item.id}`);
    } else {
      // 豆知識詳細ページへの遷移
      navigate(`/trivia/${item.id}`);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation(); // カード本体へのクリックイベントを防ぐ
    navigate(`/search?tag=${tagName}`);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      alert('いいねするにはログインが必要です。');
      return;
    }

    try {
      if (isLiked) {
        await unlikeContent(token, item.id);
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await likeContent(token, item.id);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
      onUpdate?.(); // 親コンポーネントに更新を通知
    } catch (error: any) {
      console.error('いいね操作に失敗しました:', error);
      alert(error.message || 'いいね操作に失敗しました。');
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      alert('保存するにはログインが必要です。');
      return;
    }

    try {
      if (isSaved) {
        await unsaveContent(token, item.id);
        setIsSaved(false);
      } else {
        await saveContent(token, item.id);
        setIsSaved(true);
      }
      onUpdate?.(); // 親コンポーネントに更新を通知
    } catch (error: any) {
      console.error('保存操作に失敗しました:', error);
      alert(error.message || '保存操作に失敗しました。');
    }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/report/${item.id}`);
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
        <button onClick={handleLike}>
          <img src={Heart} alt="like" width={18} height={18} /> <span>{likeCount}</span>
        </button>
        <button onClick={handleSave}>
          <img src={Bookmark} alt="save" width={18} height={18} /> <span>{isSaved ? '保存済み' : '保存'}</span>
        </button>
        <button onClick={handleReport}>
          <img src={Flag} alt="report" width={18} height={18} />
        </button>
      </div>
    </div>
  );
};

export default QuizCard;