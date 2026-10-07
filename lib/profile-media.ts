export type ProfileMedia = { id: string; url: string; type: 'image' | 'video' }
export type ProfilePost = {
  id: string; title?: string | null; content: string; category?: string | null
  created_at: string; like_count?: number; media_url?: string | null; media_type?: string | null
  link_url?: string | null
  facility_portal_post_media?: { id: string; media_url: string; media_type?: string | null; sort_order?: number }[] | null
}
export function publicWebUrl(value?: string | null) {
  if (!value) return undefined
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}
export function postMedia(post: ProfilePost): ProfileMedia[] {
  const media = [...(post.facility_portal_post_media || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const rows = media.length ? media : post.media_url ? [{ id: post.id, media_url: post.media_url, media_type: post.media_type }] : []
  return rows.filter(row => publicWebUrl(row.media_url)).map(row => ({ id: row.id, url: row.media_url, type: row.media_type?.startsWith('video') ? 'video' : 'image' }))
}
export function profilePhotos(photos: string[] | null | undefined, posts: ProfilePost[]) {
  return [...new Set([...(photos || []).filter(url => publicWebUrl(url)), ...posts.flatMap(post => postMedia(post).filter(media => media.type === 'image').map(media => media.url))])]
}
export const profileCategories = [
  { key: '', label: 'すべて' }, { key: 'daily', label: '日々のようす' }, { key: 'notice', label: 'お知らせ' },
  { key: 'event', label: 'イベント' }, { key: 'availability', label: '空き情報' }, { key: 'staff', label: 'スタッフ' },
  { key: 'recruitment', label: '求人' }, { key: 'volunteer', label: 'ボランティア' }, { key: 'other', label: 'その他' },
]
export function postCategory(value?: string | null) { return value === 'training' ? 'event' : profileCategories.some(category => category.key && category.key === value) ? value! : 'other' }
