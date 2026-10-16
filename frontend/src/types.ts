export interface User {
  id: number
  username: string
  displayName: string
  role: 'ADMIN' | 'MEMBER'
}

export interface Equipment {
  id: number
  assetCode: string
  name: string
  category: string
  location: string
  description: string
  enabled: boolean
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export type Slot = 'AM' | 'PM'

export type Status = 'RESERVED' | 'PICKED_UP' | 'RETURNED' | 'CANCELLED'

export interface Reservation {
  id: number
  equipmentId: number
  equipmentName: string
  assetCode: string
  userId: number
  memberName: string
  username: string
  date: string
  slot: Slot
  status: Status
  createdAt: string
  cancelledAt: string | null
  pickedUpAt: string | null
  returnedAt: string | null
}

export interface CalendarInfo {
  today: string
  maxDate: string
  timezone: string
  now: string
}

export interface Availability {
  equipmentId: number
  date: string
  slots: {
    slot: Slot
    label: string
    start: string
    end: string
    occupied: boolean
    bookable: boolean
    reason: string | null
  }[]
}
export const statusLabels: Record<Status, string> = {
  RESERVED: '已预约',
  PICKED_UP: '已领用',
  RETURNED: '已归还',
  CANCELLED: '已取消',
}
export const slotLabels: Record<Slot, string> = { AM: '上午 09:00—12:00', PM: '下午 14:00—18:00' }

export function timeText(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '—'
}
