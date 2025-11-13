// @/types/api.d.ts でグローバル型が定義されている前提

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
      // JSONのパースに失敗した場合（500エラーでHTMLが返ってきた場合など）
      throw new Error(`APIエラー (ステータス: ${response.status})`);
    }

    const errorDetail = errorData.detail || '不明なAPIエラーが発生しました。';

    // Home.tsx の catch ブロックが 404 (Not Found) を正しく検知できるように、
    // "not found" や "not part" という文字列をエラーメッセージに含める
    if (response.status === 404) {
      const detailString = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
      // エラーメッセージに "Not Found" や "not part" が含まれていなければ、追加する
      if (!detailString.toLowerCase().includes('not found') && !detailString.toLowerCase().includes('not part')) {
        throw new Error(`Not Found: ${detailString}`);
      }
      throw new Error(detailString);
    }

    // 401, 403, 422 などのその他のエラー
    throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
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
export const loginUser = async (email: string, password: string): Promise<Token> => {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body,
  });
  return handleResponse(response);
};
export const registerUser = async (userData: UserCreate): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
};
export const getMe = async (token: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

/**
 * 【生徒用】自身の学習統計を取得する
 * @param token - 認証トークン
 * @returns {Promise<UserStats>} - 学習統計
 */
export const getUserStats = async (token: string): Promise<UserStats> => {
  const response = await fetch(`${API_BASE_URL}/users/me/statistics`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

/**
 * 【生徒用】自身の投稿履歴を取得する
 * @param token - 認証トークン
 * @returns {Promise<ContentInfo[]>} - 投稿コンテンツの配列
 */
export const getMyPosts = async (token: string): Promise<ContentInfo[]> => {
  const response = await fetch(`${API_BASE_URL}/users/me/posts`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

/**
 * 【生徒用】自身の解答履歴を取得する
 * @param token - 認証トークン
 * @returns {Promise<UserAnswer[]>} - 解答履歴の配列
 */
export const getMyAnswers = async (token: string): Promise<UserAnswer[]> => {
  const response = await fetch(`${API_BASE_URL}/users/me/answers`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

/**
 * 【生徒用】自身がいいねしたコンテンツ一覧を取得する
 * @param token - 認証トークン
 * @returns {Promise<ContentInfo[]>} - いいねしたコンテンツの配列
 */
export const getMyLikes = async (token: string): Promise<ContentInfo[]> => {
  const response = await fetch(`${API_BASE_URL}/users/me/likes`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

/**
 * 【生徒用】自身の指摘履歴を取得する
 * @param token - 認証トークン
 * @returns {Promise<ReportDetails[]>} - 指摘履歴の配列
 */
export const getMyReports = async (token: string): Promise<ReportDetails[]> => {
  const response = await fetch(`${API_BASE_URL}/reports/me`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

// ---------------------------------------------------------------------------
// チーム API
// ---------------------------------------------------------------------------
export const getStudentTeam = async (token: string): Promise<Team> => {
  const response = await fetch(`${API_BASE_URL}/teams/me`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
export const joinTeam = async (token: string, code: string): Promise<Team> => {
  const body: TeamJoin = { join_code: code };
  const response = await fetch(`${API_BASE_URL}/teams/join`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};
export const getMyTeams = async (token: string): Promise<Team[]> => {
  const response = await fetch(`${API_BASE_URL}/teams/`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
export const createTeam = async (token: string, teamName: string): Promise<Team> => {
  const body: TeamCreate = { name: teamName };
  const response = await fetch(`${API_BASE_URL}/teams/`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};
export const regenerateCode = async (token: string, teamId: string): Promise<Team> => {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/regenerate-code`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
export const getTeamDetails = async (token: string, teamId: string): Promise<TeamDetails> => {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

// ---------------------------------------------------------------------------
// コンテンツ API
// ---------------------------------------------------------------------------
export const getFeed = async (token: string): Promise<(Quiz | Trivia)[]> => {
  // ... (省略)
  const response = await fetch(`${API_BASE_URL}/feed`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
export const getQuizzes = async (): Promise<Quiz[]> => {
  // ... (省略)
  const response = await fetch(`${API_BASE_URL}/quizzes`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
};

/**
 * 【生徒用】新規クイズを作成する
 * @param token - 認証トークン
 * @param quizData - 新規クイズデータ
 * @returns {Promise<Quiz>} - 作成されたクイズ
 */
export const createQuiz = async (token: string, quizData: QuizCreate): Promise<Quiz> => {
  const response = await fetch(`${API_BASE_URL}/quizzes`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(quizData),
  });
  return handleResponse(response);
};

/**
 * 【生徒用】新規豆知識を作成する
 * @param token - 認証トークン
 * @param triviaData - 新規豆知識データ
 * @returns {Promise<Trivia>} - 作成された豆知識
 */
export const createTrivia = async (token: string, triviaData: TriviaCreate): Promise<Trivia> => {
  const response = await fetch(`${API_BASE_URL}/facts`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(triviaData),
  });
  return handleResponse(response);
};

/**
 * 【共通】単一のクイズの詳細を取得する
 * @param quizId - クイズID
 * @returns {Promise<Quiz>} - クイズ詳細
 */
export const getQuizDetail = async (quizId: string): Promise<Quiz> => {
  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
};

/**
 * 【共通】単一の豆知識の詳細を取得する
 * @param triviaId - 豆知識ID
 * @returns {Promise<Trivia>} - 豆知識詳細
 */
export const getTriviaDetail = async (triviaId: string): Promise<Trivia> => {
  const response = await fetch(`${API_BASE_URL}/facts/${triviaId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
};



/**
 * 【共通】単一のコンテンツ（クイズまたは豆知識）の詳細を取得する
 * @param contentId - コンテンツID
 * @returns {Promise<Quiz | Trivia>} - コンテンツ詳細
 */
export const getContentDetail = async (contentId: string): Promise<Quiz | Trivia> => {
  // バックエンドに GET /quizzes/{id} と GET /facts/{id} があると想定
  // ここでは両方を取得する共通エンドポイント /content/{id} を仮定
  // もし個別の場合は、呼び出し側で content_type を見て判断

  // ★ 仮実装: /quizzes/{id} を使う (豆知識の場合は /facts/{id} が必要)
  // TODO: バックエンドのAPI仕様に基づき、/quizzes または /facts を呼び分ける
  const response = await fetch(`${API_BASE_URL}/quizzes/${contentId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  // 豆知識だった場合
  // const response = await fetch(`${API_BASE_URL}/facts/${contentId}`, ...);

  return handleResponse(response);
};

/**
 * 【生徒用】クイズに解答する
 * @param token - 認証トークン
 * @param quizId - クイズID
 * @param optionId - 選択した選択肢ID
 * @returns {Promise<AnswerResponse>} - 正誤判定と解説
 */
export const submitQuizAnswer = async (token: string, quizId: string, optionId: string): Promise<AnswerResponse> => {
  const body: AnswerCreate = { selected_option_id: optionId };

  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/answer`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};

// ---------------------------------------------------------------------------
// ダッシュボード API
// ---------------------------------------------------------------------------
export const getDashboardSummary = async (token: string, teamId?: string): Promise<DashboardSummary> => {
  // ... (省略)
  const url = new URL(`${API_BASE_URL}/dashboard/summary`);
  if (teamId) {
    url.searchParams.append('team_id', teamId);
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
export const getPopularTags = async (token: string, teamId?: string): Promise<PopularTag[]> => {
  // ... (省略)
  const url = new URL(`${API_BASE_URL}/dashboard/popular-tags`);
  if (teamId) {
    url.searchParams.append('team_id', teamId);
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

// ---------------------------------------------------------------------------
// 指摘管理 API
// ---------------------------------------------------------------------------
export const getReports = async (token: string): Promise<ReportDetails[]> => {
  // ... (省略)
  const response = await fetch(`${API_BASE_URL}/reports/`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
export const getReportContent = async (token: string, reportId: string): Promise<ContentForReport> => {
  // ... (省略)
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/content`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
export const resolveReport = async (token: string, reportId: string, updateData: ReportStatusUpdate): Promise<ReportDetails> => {
  // ... (省略)
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/resolve`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
};


// --- ★★★ ここから新規追加 (チーム詳細・メンバー一覧) ★★★ ---
/**
 * 【教師用】チームメンバーの一覧と学習サマリーを取得する
 * @param token - 認証トークン
 * @param teamId - 対象のチームID
 * @returns {Promise<TeamMembersListResponse>} - チーム詳細とメンバーリスト
 */
export const getTeamMembersWithLearningSummary = async (token: string, teamId: string): Promise<TeamMembersListResponse> => {
  // バックエンドに /api/v1/teams/{teamId}/members というAPIが実装されていると想定
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const getStudentDetails = async (token: string, studentId: string): Promise<StudentDetails> => {
  const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};
/**
 * 【生徒用】コンテンツへの指摘を投稿する
 * @param token - 認証トークン
 * @param reportData - 指摘内容
 * @returns {Promise<ReportDetails>} - 作成された指摘情報
 */
export const createReport = async (token: string, reportData: ReportCreate): Promise<ReportDetails> => {
  const response = await fetch(`${API_BASE_URL}/reports/`, { // POST /reports/
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(reportData),
  });
  return handleResponse(response);
};

