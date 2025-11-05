// @/types/api.d.ts でグローバル型 (User, Token, ApiErrorResponse) が
// 定義されていることを前提としています。（importは不要）

// バックエンドAPIのベースURL
const API_BASE_URL = 'http://localhost:8080/api/v1';

/**
 * APIレスポンスを処理する共通ハンドラ
 * @param response - fetchのレスポンスオブジェクト
 */
const handleResponse = async (response: Response) => {
  // 200番台 (OK) ではない場合の処理
  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      // エラーレスポンスのJSON ({"detail": "..."}) をパース試行
      errorData = await response.json();
    } catch (e) {
      // 500エラーなどでJSONが返ってこなかった場合
      throw new Error(`APIエラー (ステータス: ${response.status})`);
    }

    const errorDetail = errorData.detail || '不明なAPIエラーが発生しました。';

    // Home.tsx の catch ブロックが 404 (Not Found) を正しく検知できるように、
    // "not found" という文字列をエラーメッセージに含める
    if (response.status === 404) {
      // "detail" が "User is not part of..." のような文字列であることを期待
      throw new Error(`Not Found: ${errorDetail}`);
    }

    // 400, 401, 403, 422 などのその他のエラー
    throw new Error(errorDetail);
  }

  // --- 正常なレスポンス (200-299) の処理 ---
  if (response.status === 204) { // 204 (No Content)
    return null;
  }
  return response.json(); // 200 (OK) または 201 (Created)
};

/**
 * 認証ヘッダーを生成するヘルパー
 * @param token - 認証トークン
 */
const getAuthHeaders = (token: string) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};


// ---------------------------------------------------------------------------
// 認証・アカウント管理 API (Auth / Users)
// ---------------------------------------------------------------------------

/**
 * ログインAPIを呼び出す (Login.tsx が使用)
 * @param email - ユーザーのメールアドレス
 * @param password - ユーザーのパスワード
 * @returns {Promise<Token>} - アクセストークンを含むオブジェクト
 */
export const loginUser = async (email: string, password: string): Promise<Token> => {
  // バックエンドの /auth/login は OAuth2PasswordRequestForm を期待しているため、
  // 'application/x-www-form-urlencoded' 形式でデータを送信する必要があります。
  const body = new URLSearchParams();
  body.append('username', email); // FastAPIのOAuth2フォームは 'username' を期待します
  body.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body,
  });

  return handleResponse(response);
};

/**
 * ユーザー新規登録APIを呼び出す (Signup.tsx が使用)
 * @param userData - 新規ユーザー情報 (email, password, nickname, role)
 * @returns {Promise<User>} - 作成されたユーザー情報
 */
export const registerUser = async (userData: UserCreate): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  return handleResponse(response);
};


/**
 * 現在のユーザー情報を取得する (Login.tsx が使用)
 * @param token - 認証トークン
 * @returns {Promise<User>} - ユーザー情報
 */
export const getMe = async (token: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(token), // ヘルパー関数を使用
  });

  return handleResponse(response);
};

// ---------------------------------------------------------------------------
// チーム API (Home.tsx が使用)
// ---------------------------------------------------------------------------

/**
 * 【生徒用】自身が所属するチーム情報を取得する (Home.tsx が使用)
 * @param token - 認証トークン
 * @returns {Promise<Team>} - チーム情報
 */
export const getStudentTeam = async (token: string): Promise<Team> => {
  const response = await fetch(`${API_BASE_URL}/teams/me`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

/**
 * 【生徒用】チームに参加する (Home.tsx が使用)
 * @param token - 認証トークン
 * @param code - 6桁の参加コード
 * @returns {Promise<Team>} - 参加したチーム情報
 */
export const joinTeam = async (token: string, code: string): Promise<Team> => {
  const body: TeamJoin = { join_code: code };

  const response = await fetch(`${API_BASE_URL}/teams/join`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};

// ---------------------------------------------------------------------------
// コンテンツ API (Home.tsx などが使用)
// ---------------------------------------------------------------------------

/**
 * 【共通】おすすめフィード（クイズ・豆知識）を取得する (Home.tsx が使用)
 * @param token - 認証トークン
 * @returns {Promise<(Quiz | Trivia)[]>} - コンテンツの配列
 */
export const getFeed = async (token: string): Promise<(Quiz | Trivia)[]> => {
  const response = await fetch(`${API_BASE_URL}/feed`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

/**
 * 【共通】クイズ一覧を取得する (Landing.tsx の遷移先で使用)
 * ※このAPIは認証が不要
 * @returns {Promise<Quiz[]>} - クイズの配列
 */
export const getQuizzes = async (): Promise<Quiz[]> => {
  const response = await fetch(`${API_BASE_URL}/quizzes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
};

