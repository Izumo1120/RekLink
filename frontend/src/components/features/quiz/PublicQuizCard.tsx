"use client";

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PublicQuizCard.module.css';

// APIクライアント
import { submitPublicQuizAnswer } from '@lib/api';

// アイコン
import iconFlag from '@assets/icons/flag.png';

interface PublicQuizCardProps {
  item: Quiz | Trivia;
  onUpdate: () => void;
}

const PublicQuizCard = ({ item, onUpdate }: PublicQuizCardProps) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isQuiz = item.content_type === 'quiz';
  const quiz = isQuiz ? (item as Quiz) : null;
  const trivia = !isQuiz ? (item as Trivia) : null;

  // --- クイズ解答送信 ---
  const handleSubmitAnswer = async () => {
    if (!quiz || !selectedOptionId) return;

    setIsSubmitting(true);
    try {
      const result = await submitPublicQuizAnswer(item.id, selectedOptionId);
      setAnswerResult(result);
    } catch (err: any) {
      console.error('解答送信失敗:', err);
      alert(err.message || '解答の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 選択肢のスタイル決定 ---
  const getOptionStyle = (optionId: string) => {
    if (!answerResult) {
      return selectedOptionId === optionId ? styles.optionSelected : styles.option;
    }

    if (answerResult.is_correct && optionId === selectedOptionId) {
      return styles.optionCorrect;
    }
    if (!answerResult.is_correct && optionId === selectedOptionId) {
      return styles.optionIncorrect;
    }
    if (optionId === answerResult.correct_option_id) {
      return styles.optionCorrect;
    }
    return styles.option;
  };

  // --- 日時フォーマット ---
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
  };

  return (
    <div className={styles.card}>
      {/* --- カードヘッダー --- */}
      <div className={styles.cardHeader}>
        <div className={styles.authorInfo}>
          <div className={styles.avatar}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#E0E0E0" />
              <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="#9E9E9E" />
              <path d="M18 18C18 15.7909 15.3137 14 12 14C8.68629 14 6 15.7909 6 18" fill="#9E9E9E" />
            </svg>
          </div>
          <div>
            <p className={styles.authorName}>匿名ユーザー</p>
            <p className={styles.postTime}>{formatDate(item.created_at)}</p>
          </div>
        </div>
        <div className={styles.contentType}>
          <img src={iconFlag} alt="" className={styles.typeIcon} />
          <span>{isQuiz ? 'クイズ' : '豆知識'}</span>
        </div>
      </div>

      {/* --- カードコンテンツ --- */}
      <div className={styles.cardBody}>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.description}>{item.description}</p>

        {/* --- タグ表示 --- */}
        {item.tags && item.tags.length > 0 && (
          <div className={styles.tags}>
            {item.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* --- クイズの場合：選択肢 --- */}
        {isQuiz && quiz && (
          <div className={styles.quizSection}>
            <div className={styles.options}>
              {quiz.options.map((option) => (
                <button
                  key={option.id}
                  className={getOptionStyle(option.id)}
                  onClick={() => !answerResult && setSelectedOptionId(option.id)}
                  disabled={!!answerResult}
                >
                  <span className={styles.optionText}>{option.text}</span>
                  {answerResult && option.id === answerResult.correct_option_id && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {answerResult && !answerResult.is_correct && option.id === selectedOptionId && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 5L5 15M5 5L15 15" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {!answerResult && (
              <button
                className={styles.submitButton}
                onClick={handleSubmitAnswer}
                disabled={!selectedOptionId || isSubmitting}
              >
                {isSubmitting ? '送信中...' : '解答する'}
              </button>
            )}

            {answerResult && (
              <div className={answerResult.is_correct ? styles.resultCorrect : styles.resultIncorrect}>
                <p className={styles.resultTitle}>
                  {answerResult.is_correct ? '正解です！' : '不正解です'}
                </p>
                {answerResult.explanation && (
                  <p className={styles.resultExplanation}>{answerResult.explanation}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- 豆知識の場合：展開可能コンテンツ --- */}
        {!isQuiz && trivia && (
          <div className={styles.triviaSection}>
            <button
              className={styles.expandButton}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span>{isExpanded ? '豆知識を閉じる' : '豆知識を見る'}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={isExpanded ? styles.iconExpanded : ''}
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isExpanded && (
              <div className={styles.triviaContent}>
                <p>{trivia.content}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicQuizCard;
