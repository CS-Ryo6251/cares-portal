'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, MessageSquare, Heart, Info, CheckCheck, Loader2 } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  resource_type: string | null
  resource_id: string | null
  is_read: boolean
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  vacancy_change: { icon: Bell, color: 'text-blue-500 bg-blue-50' },
  comment_reply: { icon: MessageSquare, color: 'text-green-500 bg-green-50' },
  like_received: { icon: Heart, color: 'text-pink-500 bg-pink-50' },
  system: { icon: Info, color: 'text-gray-500 bg-gray-100' },
}

function buildResourceUrl(resourceType: string | null, resourceId: string | null): string | null {
  if (!resourceType || !resourceId) return null

  switch (resourceType) {
    case 'listing':
      return `/directory/${resourceId}`
    case 'facility':
      return `/facility/${resourceId}`
    case 'comment':
      return `/directory/${resourceId}`
    default:
      return null
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}時間前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}日前`

  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (targetDate.getTime() === today.getTime()) return '今日'
  if (targetDate.getTime() === yesterday.getTime()) return '昨日'
  return 'それ以前'
}

function groupNotifications(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>()
  const order = ['今日', '昨日', 'それ以前']

  for (const n of notifications) {
    const group = getDateGroup(n.created_at)
    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group)!.push(n)
  }

  // 順序を保証
  const ordered = new Map<string, Notification[]>()
  for (const key of order) {
    if (groups.has(key)) {
      ordered.set(key, groups.get(key)!)
    }
  }
  return ordered
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
    } catch {
      // エラー時は空配列のまま
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    // 楽観的更新
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_ids: [notificationId] }),
    })
  }

  const markAllRead = async () => {
    setMarkingAll(true)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all_read: true }),
    })

    setMarkingAll(false)
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    const url = buildResourceUrl(notification.resource_type, notification.resource_id)
    if (url) {
      window.location.href = url
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  const grouped = groupNotifications(notifications)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">通知</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-400">{unreadCount}件の未読</p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            すべて既読にする
          </button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm">通知はありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([group, items]) => (
            <div key={group}>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
                {group}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {items.map(notification => {
                  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system
                  const Icon = config.icon
                  const hasLink = !!buildResourceUrl(notification.resource_type, notification.resource_id)

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${
                        hasLink ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                      } ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notification.body && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
