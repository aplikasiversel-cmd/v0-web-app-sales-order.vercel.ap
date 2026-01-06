"use server"

import {
  getNotificationsByUserId as getNeonNotificationsByUserId,
  createNotification as createNeonNotification,
  markNotificationAsRead as markNeonNotificationAsRead,
  markAllNotificationsAsRead as markNeonAllNotificationsAsRead,
  getUsers as getNeonUsers,
  getUsersByRole as getNeonUsersByRole,
} from "./db-actions"
import type { UserRole } from "@/lib/types"

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "order_new" | "slik_result" | "order_approve" | "order_reject" | "activity"
  referenceId?: string
  isRead: boolean
  createdAt: string
  createdById?: string
  createdByName?: string
}

let notificationsCache: { data: Notification[]; timestamp: number; userId?: string } | null = null
const CACHE_TTL = 60000 // 1 minute (can be shorter since Neon has no rate limits)

// Get notifications for a user
export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    // Check cache first
    const now = Date.now()
    if (notificationsCache && notificationsCache.userId === userId && now - notificationsCache.timestamp < CACHE_TTL) {
      return notificationsCache.data
    }

    const notifications = await getNeonNotificationsByUserId(userId)
    const mapped = notifications.map((n: any) => ({
      id: n.id,
      userId: n.userId || n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      referenceId: n.referenceId || n.reference_id,
      isRead: n.isRead ?? n.is_read ?? false,
      createdAt: n.createdAt || n.created_at,
      createdById: n.createdById || n.created_by_id,
      createdByName: n.createdByName || n.created_by_name,
    }))

    // Sort by date and limit
    const sorted = mapped
      .sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)

    notificationsCache = { data: sorted, timestamp: now, userId }
    return sorted
  } catch (error) {
    console.error("[Notification] Error getting notifications:", error)
    return notificationsCache?.data || []
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notifications = await getNotifications(userId)
    return notifications.filter((n) => !n.isRead).length
  } catch (error) {
    console.error("[Notification] Error getting unread count:", error)
    return 0
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await markNeonNotificationAsRead(notificationId)
    notificationsCache = null // Invalidate cache
  } catch (error) {
    console.error("[Notification] Error marking as read:", error)
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await markNeonAllNotificationsAsRead(userId)
    notificationsCache = null // Invalidate cache
  } catch (error) {
    console.error("[Notification] Error marking all as read:", error)
  }
}

export async function createNotification(
  notification: Omit<Notification, "id" | "createdAt" | "isRead">,
): Promise<void> {
  try {
    await createNeonNotification({
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      referenceId: notification.referenceId,
      createdById: notification.createdById,
      createdByName: notification.createdByName,
    })
    notificationsCache = null // Invalidate cache
  } catch (error) {
    console.error("[Notification] Error creating notification:", error)
  }
}

let usersCache: { data: any[]; timestamp: number } | null = null
const USERS_CACHE_TTL = 60000 // 1 minute

async function getCachedUsers(): Promise<any[]> {
  const now = Date.now()
  if (usersCache && now - usersCache.timestamp < USERS_CACHE_TTL) {
    return usersCache.data
  }

  try {
    const users = await getNeonUsers()
    usersCache = { data: users, timestamp: now }
    return users
  } catch (error) {
    return usersCache?.data || []
  }
}

// Get users by role for sending notifications
export async function getUsersByRole(role: UserRole): Promise<{ id: string; namaLengkap: string }[]> {
  try {
    const users = await getNeonUsersByRole(role)
    return users
      .filter((u: any) => u.isActive ?? u.is_active)
      .map((u: any) => ({
        id: u.id,
        namaLengkap: u.namaLengkap || u.nama_lengkap,
      }))
  } catch (error) {
    console.error("[Notification] Error getting users by role:", error)
    return []
  }
}

// Notify Sales and CMH when CMO fills SLIK result, Approve, or Reject
export async function notifySlikOrDecision(
  orderId: string,
  orderNasabah: string,
  salesId: string,
  cmoName: string,
  cmoId: string,
  action: "slik_result" | "order_approve" | "order_reject",
  note?: string,
): Promise<void> {
  try {
    const cmhUsers = await getUsersByRole("cmh")

    let title = ""
    let message = ""

    switch (action) {
      case "slik_result":
        title = "Hasil SLIK Diinput"
        message = `${cmoName} telah mengisi hasil SLIK untuk order ${orderNasabah}${note ? `. Note: ${note}` : ""}`
        break
      case "order_approve":
        title = "Order Disetujui"
        message = `${cmoName} telah menyetujui order ${orderNasabah}${note ? `. Catatan: ${note}` : ""}`
        break
      case "order_reject":
        title = "Order Ditolak"
        message = `${cmoName} telah menolak order ${orderNasabah}${note ? `. Alasan: ${note}` : ""}`
        break
    }

    // Notify Sales
    await createNotification({
      userId: salesId,
      title,
      message,
      type: action,
      referenceId: orderId,
      createdById: cmoId,
      createdByName: cmoName,
    })

    // Notify all CMH
    for (const cmh of cmhUsers) {
      await createNotification({
        userId: cmh.id,
        title,
        message,
        type: action,
        referenceId: orderId,
        createdById: cmoId,
        createdByName: cmoName,
      })
    }
  } catch (error) {
    console.error("[Notification] notifySlikOrDecision error:", error)
  }
}

// Notify CMO and CMH when Sales creates a new order
export async function notifyNewOrder(
  orderId: string,
  orderNasabah: string,
  salesName: string,
  salesId: string,
  cmoId?: string,
): Promise<void> {
  try {
    const title = "Order Baru"
    const message = `${salesName} telah menginput order baru untuk ${orderNasabah}`

    const cmhUsers = await getUsersByRole("cmh")

    if (cmoId) {
      await createNotification({
        userId: cmoId,
        title,
        message,
        type: "order_new",
        referenceId: orderId,
        createdById: salesId,
        createdByName: salesName,
      })
    }

    for (const cmh of cmhUsers) {
      await createNotification({
        userId: cmh.id,
        title,
        message,
        type: "order_new",
        referenceId: orderId,
        createdById: salesId,
        createdByName: salesName,
      })
    }
  } catch (error) {
    console.error("[Notification] notifyNewOrder error:", error)
  }
}

// Notify CMH when CMO inputs activity
export async function notifyNewActivity(
  aktivitasId: string,
  cmoName: string,
  cmoId: string,
  jenisAktivitas: string,
  dealer: string,
): Promise<void> {
  try {
    const title = "Aktivitas Baru"
    const message = `${cmoName} telah menginput aktivitas ${jenisAktivitas} di ${dealer}`

    const cmhUsers = await getUsersByRole("cmh")

    for (const cmh of cmhUsers) {
      await createNotification({
        userId: cmh.id,
        title,
        message,
        type: "activity",
        referenceId: aktivitasId,
        createdById: cmoId,
        createdByName: cmoName,
      })
    }
  } catch (error) {
    console.error("[Notification] notifyNewActivity error:", error)
  }
}
