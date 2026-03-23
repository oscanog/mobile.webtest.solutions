import type { NotificationRecord } from './api'

const DEFAULT_NOTIFICATIONS_WS_PATH = '/ws/notifications'

export const NOTIFICATIONS_WS_PATH = (import.meta.env.VITE_NOTIFICATIONS_WS_PATH?.trim() || DEFAULT_NOTIFICATIONS_WS_PATH).replace(
  /\s+/g,
  '',
)

export type NotificationConnectionState = 'idle' | 'connecting' | 'connected' | 'polling'

export interface NotificationRealtimeEvent {
  type: 'notification.created' | 'notification.read' | 'notification.read_all'
  notification?: NotificationRecord
  unread_count?: number
  total_count?: number
  updated?: number
  timestamp?: string
}

export function buildNotificationsSocketUrl(path: string, socketToken: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = new URL(path || NOTIFICATIONS_WS_PATH, `${protocol}//${window.location.host}`)
  url.searchParams.set('token', socketToken)
  return url.toString()
}

export function parseNotificationRealtimeEvent(message: string): NotificationRealtimeEvent | null {
  try {
    const parsed = JSON.parse(message) as NotificationRealtimeEvent
    if (
      parsed &&
      (parsed.type === 'notification.created' || parsed.type === 'notification.read' || parsed.type === 'notification.read_all')
    ) {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

export function upsertNotificationRecord(current: NotificationRecord[], notification: NotificationRecord): NotificationRecord[] {
  const next = current.filter((item) => item.id !== notification.id)
  return [notification, ...next].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime()
    const rightTime = new Date(right.created_at).getTime()
    if (leftTime === rightTime) {
      return right.id - left.id
    }
    return rightTime - leftTime
  })
}
