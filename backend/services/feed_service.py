import asyncpg
from typing import List, Dict
from uuid import UUID

class FeedService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_scored_feed_for_user(self, user_id: UUID, team_id: UUID) -> List[Dict]:
        """
        指定されたユーザーのためのおすすめフィードをスコア計算して取得します。

        :param user_id: フィードを閲覧するユーザーのID
        :param team_id: ユーザーが所属するチームのID
        :return: スコア順にソートされたコンテンツのリスト
        """
        # 1. チームの試験範囲設定を取得
        exam_tags = await self._get_exam_tags(team_id)

        # 2. フィードに表示する候補となるコンテンツを取得 (例: 直近1週間の投稿)
        contents = await self.conn.fetch(
            """
            SELECT c.*, u.nickname as author_nickname
            FROM contents c
            JOIN users u ON c.author_id = u.id
            WHERE c.is_published = TRUE AND c.created_at > NOW() - INTERVAL '7 days'
            """
        )

        # 3. 各コンテンツのスコアを非同期で計算
        scored_contents = []
        for content in contents:
            score = await self._calculate_score(content, user_id, exam_tags)
            scored_contents.append({**content, "score": score})

        # 4. スコアの高い順にソート
        scored_contents.sort(key=lambda x: x['score'], reverse=True)

        return scored_contents

    async def _calculate_score(self, content: asyncpg.Record, user_id: UUID, exam_tags: set) -> float:
        """
        個別のコンテンツのスコアを計算する内部メソッド。
        """
        score = 0.0

        # --- (1) 投稿に関する情報 ---
        # 反応数 (エンゲージメント)
        interactions = await self.conn.fetch(
            "SELECT interaction_type, COUNT(*) as count FROM interactions WHERE content_id = $1 GROUP BY interaction_type",
            content['id']
        )
        for interaction in interactions:
            if interaction['interaction_type'] == 'like':
                score += interaction['count'] * 1.0  # いいね: +1点
            elif interaction['interaction_type'] == 'save':
                score += interaction['count'] * 5.0  # 保存: +5点

        # 新規投稿ボーナス (投稿後24時間以内)
        if (content['created_at'].replace(tzinfo=None) - content['created_at'].replace(tzinfo=None)).total_seconds() < 86400:
            score += 5.0

        # --- (2) ユーザーの行動履歴 (簡易版) ---
        # ユーザーがこの投稿に「いいね」しているか
        user_liked = await self.conn.fetchval(
            "SELECT 1 FROM interactions WHERE content_id = $1 AND user_id = $2 AND interaction_type = 'like'",
            content['id'], user_id
        )
        if user_liked:
            score += 3.0 # 過去のエンゲージメント

        # --- (3) 定期試験や出来事の反映 ---
        content_tags = await self.conn.fetch(
            "SELECT t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1",
            content['id']
        )
        content_tag_names = {tag['name'] for tag in content_tags}
        
        # 試験範囲ボーナス (試験範囲のタグが含まれていれば高スコア)
        if not exam_tags.isdisjoint(content_tag_names):
            score += 15.0

        # TODO: 虚偽情報などのペナルティ処理を実装

        return score

    async def _get_exam_tags(self, team_id: UUID) -> set:
        """
        現在有効な試験範囲に設定されているタグのセットを取得します。
        """
        tag_records = await self.conn.fetch(
            """
            SELECT t.name
            FROM study_setting_tags sst
            JOIN tags t ON sst.tag_id = t.id
            JOIN study_settings ss ON sst.study_setting_id = ss.id
            WHERE ss.team_id = $1
              AND ss.exam_range_start <= NOW()
              AND ss.exam_range_end >= NOW()
            """,
            team_id
        )
        return {record['name'] for record in tag_records}