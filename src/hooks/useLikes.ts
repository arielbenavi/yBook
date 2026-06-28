import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUserId } from './useUserId'

type LikeState = {
  counts: Map<string, number>
  userLikes: Set<string>
}

export function useLikes() {
  const userId = useUserId()
  const [state, setState] = useState<LikeState>({ counts: new Map(), userLikes: new Set() })
  const [isLoading, setIsLoading] = useState(supabase !== null)
  const inflightRef = useRef(new Set<string>())

  useEffect(() => {
    if (!supabase) return

    async function load() {
      const [allRows, userRows] = await Promise.all([
        supabase!.from('likes').select('comment_id'),
        supabase!.from('likes').select('comment_id').eq('user_id', userId),
      ])

      const counts = new Map<string, number>()
      if (allRows.data) {
        for (const row of allRows.data) {
          const id = row.comment_id as string
          counts.set(id, (counts.get(id) ?? 0) + 1)
        }
      }

      const userLikes = new Set<string>()
      if (userRows.data) {
        for (const row of userRows.data) {
          userLikes.add(row.comment_id as string)
        }
      }

      setState({ counts, userLikes })
      setIsLoading(false)
    }

    load()
  }, [userId])

  const toggleLike = useCallback(
    (commentId: string) => {
      if (!supabase) return
      if (inflightRef.current.has(commentId)) return
      inflightRef.current.add(commentId)

      const wasLiked = state.userLikes.has(commentId)

      setState(prev => {
        const counts = new Map(prev.counts)
        const userLikes = new Set(prev.userLikes)
        if (wasLiked) {
          userLikes.delete(commentId)
          const c = (counts.get(commentId) ?? 1) - 1
          if (c <= 0) counts.delete(commentId)
          else counts.set(commentId, c)
        } else {
          userLikes.add(commentId)
          counts.set(commentId, (counts.get(commentId) ?? 0) + 1)
        }
        return { counts, userLikes }
      })

      const op = wasLiked
        ? supabase.from('likes').delete().eq('comment_id', commentId).eq('user_id', userId)
        : supabase.from('likes').insert({ comment_id: commentId, user_id: userId })

      op.then(({ error }) => {
        if (error) {
          setState(prev => {
            const counts = new Map(prev.counts)
            const userLikes = new Set(prev.userLikes)
            if (wasLiked) {
              userLikes.add(commentId)
              counts.set(commentId, (counts.get(commentId) ?? 0) + 1)
            } else {
              userLikes.delete(commentId)
              const c = (counts.get(commentId) ?? 1) - 1
              if (c <= 0) counts.delete(commentId)
              else counts.set(commentId, c)
            }
            return { counts, userLikes }
          })
        }
        inflightRef.current.delete(commentId)
      })
    },
    [state.userLikes, userId],
  )

  return { likeCounts: state.counts, userLikes: state.userLikes, toggleLike, isLoading, enabled: supabase !== null }
}
