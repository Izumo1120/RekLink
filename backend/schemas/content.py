import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, conlist
from datetime import datetime

# --- 選択肢 (Quiz Option) ---
class QuizOptionBase(BaseModel):
    option_text: str = Field(..., max_length=500)
    is_correct: bool = False

class QuizOptionCreate(QuizOptionBase):
    pass

class QuizOption(QuizOptionBase):
    id: uuid.UUID
    display_order: int

    class Config:
        from_attributes = True

# --- タグ (Tag) ---
class Tag(BaseModel):
    name: str

    class Config:
        from_attributes = True

# --- コンテンツ (Content) ---
class ContentBase(BaseModel):
    title: str = Field(..., max_length=300)
    content: str
    explanation: Optional[str] = None

# --- クイズ (Quiz) ---
class QuizCreate(ContentBase):
    # conlistで選択肢の数を2〜10に制限
    options: conlist(QuizOptionCreate, min_length=2, max_length=10)
    tags: Optional[List[str]] = None # タグ名を文字列のリストとして受け取る

class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    content: Optional[str] = None
    explanation: Optional[str] = None
    options: Optional[conlist(QuizOptionCreate, min_length=2, max_length=10)] = None
    tags: Optional[List[str]] = None

class Quiz(ContentBase):
    id: uuid.UUID
    content_type: str
    author_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    options: List[QuizOption]
    tags: List[Tag] = [] # 取得時にはタグの情報を含める

    class Config:
        from_attributes = True


# --- 豆知識 (Trivia) ---
class TriviaCreate(ContentBase):
    tags: Optional[List[str]] = None # タグ名を文字列のリストとして受け取る

class TriviaUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    content: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[List[str]] = None

class Trivia(ContentBase):
    id: uuid.UUID
    content_type: str
    author_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    tags: List[Tag] = []

    class Config:
        from_attributes = True


# --- 解答 (Answer) ---
class AnswerCreate(BaseModel):
    selected_option_id: uuid.UUID

class AnswerResponse(BaseModel):
    is_correct: bool
    correct_option_id: uuid.UUID
    explanation: Optional[str] = None

class UserAnswer(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    quiz_title: str
    selected_option_id: uuid.UUID
    is_correct: bool
    answered_at: datetime

    class Config:
        from_attributes = True


# --- ★★★ ここから新規追加 ★★★ ---

# --- マイページ・履歴用の簡易コンテンツ情報 ---
class ContentInfo(BaseModel):
    """
    マイページで投稿、いいね、保存の一覧を表示するための簡易的なコンテンツ情報
    """
    id: uuid.UUID
    content_type: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True