// このファイルは src/types/api.d.ts として保存してください。
// バックエンドの /schemas/*.py に対応するTypeScriptの型定義です。
// "export" を削除し、グローバル型定義に変更

/**
 * APIエラーレスポンスのスキーマ (FastAPIのHTTPException用)
 */
interface ApiErrorResponse {
  detail: string | any; // エラー詳細
}

/**
 * トークンのスキーマ (schemas/token.py の Token に対応)
 */
interface Token {
  access_token: string;
  token_type: 'bearer';
}

/**
 * ユーザー情報のスキーマ (schemas/user.py の User に対応)
 */
interface User {
  id: string; // UUID
  email: string;
  nickname: string | null;
  role: 'student' | 'teacher' | 'admin';
  profile_image_url: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601 形式の日時文字列
}

/**
 * 新規登録用のスキーマ (schemas/user.py の UserCreate に対応)
 */
interface UserCreate {
  email: string;
  password: string;
  nickname: string;
  role: 'student' | 'teacher';
}

/**
 * チーム情報のスキーマ (schemas/team.py の Team に対応)
 */
interface Team {
  id: string; // UUID
  name: string;
  join_code: string;
  created_at: string;
}

/**
 * チーム作成用のスキーマ (schemas/team.py の TeamCreate に対応)
 */
interface TeamCreate {
  name: string;
}

/**
 * チーム所属生徒のスキーマ (schemas/team.py の TeamStudent に対応)
 */
interface TeamStudent {
  user_id: string; // UUID
  nickname: string | null;
  email: string;
  joined_at: string;
}

/**
 * チーム詳細のスキーマ (schemas/team.py の TeamDetails に対応)
 */
interface TeamDetails extends Team {
  students: TeamStudent[];
}

/**
 * チーム参加用のスキーマ (schemas/team.py の TeamJoin に対応)
 */
interface TeamJoin {
  join_code: string;
}

/**
 * タグのスキーマ (schemas/content.py の Tag に対応)
 */
interface Tag {
  name: string;
}

/**
 * クイズ選択肢（作成用）のスキーマ (schemas/content.py の QuizOptionCreate に対応)
 */
interface QuizOptionCreate {
  option_text: string;
  is_correct: boolean;
}

/**
 * クイズ選択肢のスキーマ (schemas/content.py の QuizOption に対応)
 */
interface QuizOption {
  id: string; // UUID
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

/**
 * クイズのスキーマ (schemas/content.py の Quiz に対応)
 */
interface Quiz {
  id: string; // UUID
  content_type: 'quiz';
  title: string;
  content: string;
  explanation: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  options: QuizOption[];
  tags: Tag[];
}

/**
 * クイズ作成用のスキーマ (schemas/content.py の QuizCreate に対応)
 */
interface QuizCreate {
  title: string;
  content: string;
  explanation?: string | null;
  options: QuizOptionCreate[]; // QuizOption[] から QuizOptionCreate[] に変更
  tags?: string[] | null;
}

/**
 * 豆知識のスキーマ (schemas/content.py の Trivia に対応)
 */
interface Trivia {
  id: string; // UUID
  content_type: 'trivia';
  title: string;
  content: string;
  explanation: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

/**
 * 豆知識作成用のスキーマ (schemas/content.py の TriviaCreate に対応)
 */
interface TriviaCreate {
  title: string;
  content: string;
  explanation?: string | null;
  tags?: string[] | null;
}
/**
 * ダッシュボードサマリーのスキーマ (schemas/dashboard.py の DashboardSummary に対応)
 */
interface DashboardSummary {
  total_students: number;
  total_quizzes_answered: number;
  overall_accuracy: number;
  total_posts_created: number;
  pending_reports_count: number;
}

/**
 * 人気タグのスキーマ (schemas/dashboard.py の PopularTag に対応)
 */
interface PopularTag {
  tag_id: string; // UUID
  tag_name: string;
  usage_count: number;
}

/**
 * 指摘カテゴリの型
 */
type ReportCategory = 'major_error' | 'minor_error' | 'improvement' | 'other';
/**
 * 指摘ステータスの型
 */
type ReportStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

/**
 * 指摘ステータス更新リクエストのスキーマ (schemas/report.py の ReportStatusUpdate に対応)
 */
interface ReportStatusUpdate {
  status: ReportStatus;
  resolution_note?: string;
}

/**
 * 指摘の詳細スキーマ (schemas/report.py の ReportDetails に対応)
 */
interface ReportDetails {
  id: string; // UUID
  content_id: string; // UUID
  reporter_id: string; // UUID
  reporter_nickname: string | null;
  content_title: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

/**
 * 指摘対象コンテンツのスキーマ (schemas/report.py の ContentForReport に対応)
 */
interface ContentForReport {
  id: string; // UUID
  content_type: 'quiz' | 'trivia';
  title: string;
  content: string;
  explanation: string | null;
  // options: QuizOption[]; // TODO: 必要に応じて追加
}

/**
 * 生徒の学習サマリーのスキーマ (バックエンドで計算される想定)
 */
interface StudentLearningSummary {
  posts_count: number;
  answers_count: number;
  accuracy: number;
  last_activity_at: string | null;
  is_active: boolean; // 最終活動から一定期間内かどうか
}

/**
 * チームメンバー詳細のスキーマ (バックエンドでJOIN・集計される想定)
 */
interface TeamMemberDetails {
  user_id: string; // UUID
  nickname: string | null;
  email: string;
  joined_at: string;
  learning_summary: StudentLearningSummary;
}

/**
 * チームメンバーリストレスポンスのスキーマ
 * (GET /api/v1/teams/{teamId}/members のレスポンスを想定)
 */
interface TeamMembersListResponse {
  team_id: string;
  team_name: string;
  total_members: number;
  active_members_count: number;
  average_posts_per_member: number;
  overall_average_accuracy: number;
  members: TeamMemberDetails[];
}

/**
 * 簡易コンテンツ情報 (schemas/content.py の ContentInfo に対応)
 */
interface ContentInfo {
  id: string; // UUID
  content_type: 'quiz' | 'trivia';
  title: string;
  created_at: string;
}

/**
 * ユーザー解答履歴 (schemas/content.py の UserAnswer に対応)
 */
interface UserAnswer {
  id: string; // UUID
  content_id: string; // UUID
  quiz_title: string;
  selected_option_id: string; // UUID
  is_correct: boolean;
  answered_at: string;
}

/**
 * ユーザー統計 (schemas/user.py の UserStats に対応)
 */
interface UserStats {
  total_quizzes_answered: number;
  correct_answers: number;
  accuracy: number;
  posts_created: number;
}

/**
 * 生徒詳細 (schemas/user.py の StudentDetails に対応)
 */
interface StudentDetails {
  profile: User;
  stats: UserStats;
  recent_posts: ContentInfo[];
  recent_answers: UserAnswer[];
}
/**
 * クイズ解答 送信用スキーマ (AnswerCreate)
 */
interface AnswerCreate {
  selected_option_id: string; // UUID
}

/**
 * クイズ解答 レスポンススキーマ (AnswerResponse)
 */
interface AnswerResponse {
  is_correct: boolean;
  correct_option_id: string; // UUID
  explanation: string | null;
}
/**
 * 指摘（レポート）作成用のスキーマ (schemas/report.py の ReportCreate に対応)
 */
interface ReportCreate {
  content_id: string; // UUID
  category: ReportCategory;
  description: string;
}