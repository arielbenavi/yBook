// Single source of truth for the yBook data model.
// Mirrors the spec in PROJECT.md; the app and the scraper both target these shapes.

export type Comment = {
  id: string
  author: string          // e.g. "אבי"
  timestamp: string       // ISO 8601
  title?: string          // Ynet talkbacks have a bold title line
  body: string
  likes: number
  dislikes: number
  replyCount: number
  replies?: Comment[]     // nested, same shape
  score?: number          // computed, not stored
  humor?: number          // 0–10, from Gemini scoring
  humorReason?: string    // one-sentence Hebrew explanation
}

export type ArticleRef = {
  id: string              // slug, e.g. "sywkiqzmgx"
  url: string
  title: string
  source: 'ynet'
  author: string          // article byline, e.g. "ליאור בן ארי"
  publishedAt: string     // ISO 8601
  imageUrl?: string
}

export type Post = {
  comment: Comment
  quoted: ArticleRef
}

export type Feed = {
  generatedAt: string
  posts: Post[]
}
