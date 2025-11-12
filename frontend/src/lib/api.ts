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