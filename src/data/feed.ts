import type { ArticleRef, Comment, Feed, Post } from '../types'

export class FeedShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FeedShapeError'
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function requireString(obj: Record<string, unknown>, key: string, path: string): string {
  const v = obj[key]
  if (typeof v !== 'string') {
    throw new FeedShapeError(`${path}.${key}: expected string, got ${typeof v}`)
  }
  return v
}

function requireNumber(obj: Record<string, unknown>, key: string, path: string): number {
  const v = obj[key]
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new FeedShapeError(`${path}.${key}: expected number, got ${typeof v}`)
  }
  return v
}

function optionalString(obj: Record<string, unknown>, key: string, path: string): string | undefined {
  const v = obj[key]
  if (v === undefined) return undefined
  if (typeof v !== 'string') {
    throw new FeedShapeError(`${path}.${key}: expected string or undefined, got ${typeof v}`)
  }
  return v
}

function optionalNumber(obj: Record<string, unknown>, key: string, path: string): number | undefined {
  const v = obj[key]
  if (v === undefined) return undefined
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new FeedShapeError(`${path}.${key}: expected number or undefined, got ${typeof v}`)
  }
  return v
}

function checkComment(v: unknown, path: string): Comment {
  if (!isObject(v)) throw new FeedShapeError(`${path}: expected object, got ${typeof v}`)
  const id = requireString(v, 'id', path)
  const author = requireString(v, 'author', path)
  const timestamp = requireString(v, 'timestamp', path)
  const body = requireString(v, 'body', path)
  const likes = requireNumber(v, 'likes', path)
  const dislikes = requireNumber(v, 'dislikes', path)
  const replyCount = requireNumber(v, 'replyCount', path)
  const title = optionalString(v, 'title', path)
  const score = optionalNumber(v, 'score', path)
  const humor = optionalNumber(v, 'humor', path)
  const humorReason = optionalString(v, 'humorReason', path)

  if (humor !== undefined && (humor < 0 || humor > 10)) {
    throw new FeedShapeError(`${path}.humor: expected 0–10, got ${humor}`)
  }

  let replies: Comment[] | undefined
  if (v.replies !== undefined) {
    if (!Array.isArray(v.replies)) {
      throw new FeedShapeError(`${path}.replies: expected array, got ${typeof v.replies}`)
    }
    replies = v.replies.map((r, i) => checkComment(r, `${path}.replies[${i}]`))
    if (replies.length !== replyCount) {
      throw new FeedShapeError(
        `${path}: replyCount (${replyCount}) does not match replies.length (${replies.length})`,
      )
    }
  }

  return { id, author, timestamp, title, body, likes, dislikes, replyCount, replies, score, humor, humorReason }
}

function checkArticleRef(v: unknown, path: string): ArticleRef {
  if (!isObject(v)) throw new FeedShapeError(`${path}: expected object, got ${typeof v}`)
  const id = requireString(v, 'id', path)
  const url = requireString(v, 'url', path)
  const title = requireString(v, 'title', path)
  const author = requireString(v, 'author', path)
  const publishedAt = requireString(v, 'publishedAt', path)
  const imageUrl = optionalString(v, 'imageUrl', path)
  if (v.source !== 'ynet') {
    throw new FeedShapeError(
      `${path}.source: expected literal "ynet", got ${JSON.stringify(v.source)}`,
    )
  }
  return { id, url, title, source: 'ynet', author, publishedAt, imageUrl }
}

function checkPost(v: unknown, path: string): Post {
  if (!isObject(v)) throw new FeedShapeError(`${path}: expected object, got ${typeof v}`)
  return {
    comment: checkComment(v.comment, `${path}.comment`),
    quoted: checkArticleRef(v.quoted, `${path}.quoted`),
  }
}

function checkFeed(v: unknown): Feed {
  if (!isObject(v)) throw new FeedShapeError(`feed: expected object, got ${typeof v}`)
  if (typeof v.generatedAt !== 'string') {
    throw new FeedShapeError(`feed.generatedAt: expected string, got ${typeof v.generatedAt}`)
  }
  if (!Array.isArray(v.posts)) {
    throw new FeedShapeError(`feed.posts: expected array, got ${typeof v.posts}`)
  }
  return {
    generatedAt: v.generatedAt,
    posts: v.posts.map((p, i) => checkPost(p, `feed.posts[${i}]`)),
  }
}

export async function loadFeed(): Promise<Feed> {
  const resp = await fetch('/feed.json')
  if (!resp.ok) {
    throw new FeedShapeError(`Failed to load feed: ${resp.status}`)
  }
  return checkFeed(await resp.json())
}
