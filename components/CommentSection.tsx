'use client'

import { useState, useEffect, useCallback } from 'react'

type Comment = {
  id: string
  post_id: string
  facility_id: string
  commenter_name: string
  comment_text: string
  created_at: string
}

type CommentSectionProps = {
  postId: string
  facilityId: string
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function CommentSection({ postId, facilityId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?post_id=${postId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setComments(data.comments || [])
    } catch {
      // Silently fail on fetch error; comments section just stays empty
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const trimmedName = name.trim()
    const trimmedText = text.trim()

    if (!trimmedName) {
      setError('お名前を入力してください')
      return
    }
    if (!trimmedText) {
      setError('コメントを入力してください')
      return
    }
    if (trimmedName.length > 50) {
      setError('お名前は50文字以内で入力してください')
      return
    }
    if (trimmedText.length > 500) {
      setError('コメントは500文字以内で入力してください')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          facility_id: facilityId,
          commenter_name: trimmedName,
          comment_text: trimmedText,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'コメントの投稿に失敗しました')
      }

      setText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コメントの投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Comment list */}
      {loading ? (
        <div className="py-6 text-center">
          <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-cares-600 rounded-full animate-spin" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar placeholder */}
              <div className="shrink-0 w-9 h-9 rounded-full bg-cares-100 flex items-center justify-center text-cares-700 text-sm font-bold">
                {comment.commenter_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold text-gray-900">
                    {comment.commenter_name}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatRelativeDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-base text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                  {comment.comment_text}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">
          まだコメントはありません。最初のコメントを投稿してみましょう。
        </p>
      )}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4 space-y-3">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前"
            maxLength={50}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 focus:bg-white outline-none transition-colors placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="コメントを書く..."
            maxLength={500}
            rows={2}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 focus:bg-white outline-none transition-colors placeholder:text-gray-400 resize-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 self-end px-5 py-3 bg-cares-600 hover:bg-cares-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {submitting ? '送信中...' : '投稿'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            コメントを投稿しました
          </p>
        )}
      </form>
    </div>
  )
}
