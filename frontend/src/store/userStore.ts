import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// グローバル型定義（api.d.ts）を読み込むため、importは不要

// --- ストアの型定義 ---
interface UserState {
  token: string | null;
  user: User | null;
  isAuthenticated: () => boolean; // 認証状態を返す便利なゲッター
  login: (token: string, user: User) => void;
  logout: () => void;
}

/**
 * ユーザーの認証状態（トークンとユーザー情報）を管理するZustandストア
 * * persistミドルウェアを使用することで、状態が自動的にlocalStorageに保存され、
 * ブラウザをリロードしてもログイン状態が維持されます。
 */
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // --- State (状態) ---
      token: null,
      user: null,

      // --- Getters (派生状態) ---
      isAuthenticated: () => {
        return !!get().token && !!get().user;
      },

      // --- Actions (アクション) ---

      /**
       * ログイン時にトークンとユーザー情報をセットする
       */
      login: (token: string, user: User) => {
        // ★★★ エラー修正 ★★★
        // 'state' が 'any' 型にならないよう、明示的に型を指定
        set((state: UserState) => ({ ...state, token, user }));

        // TODO: ここでapi.tsのデフォルトヘッダーにトークンを設定するなどの
        // 副作用（APIクライアントの設定）を行うのが望ましい
      },

      /**
       * ログアウト時にトークンとユーザー情報をクリアする
       */
      logout: () => {
        // ★★★ エラー修正 ★★★
        // 'state' が 'any' 型にならないよう、明示的に型を指定
        set((state: UserState) => ({ ...state, token: null, user: null }));

        // TODO: api.tsのデフォルトヘッダーからもトークンを削除する
      },
    }),
    {
      // --- persistミドルウェアの設定 ---
      name: 'reflink-user-storage', // localStorageに保存されるキー名
      storage: createJSONStorage(() => localStorage), // 保存先としてlocalStorageを指定
    }
  )
);

