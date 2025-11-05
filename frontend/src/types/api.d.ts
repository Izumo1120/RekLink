// このファイルは src/types/api.d.ts として保存してください。
// バックエンドの /schemas/*.py に対応するTypeScriptの型定義です。
// "export" を削除し、グローバル型定義に変更

/**
 * APIエラーレスポンスのスキーマ (FastAPIのHTTPException用)
 */
interface ApiErrorResponse {
  detail: string | any; // ★ 'detail' を追加
}

/**
 * トークンのスキーマ (schemas/token.py の Token に対応)
 */
interface Token {
  access_token: string; // ★ 'access_token' を追加
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
  email: string;      // ★ 'email' を追加
  password: string;   // ★ 'password' を追加
  nickname: string;   // ★ 'nickname' を追加
  role: 'student' | 'teacher'; // ★ 'role' を追加
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

