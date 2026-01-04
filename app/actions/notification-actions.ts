"use server"

import {
  getNotifications as getFirebaseNotifications,
  createNotification as createFirebaseNotification,
  markNotificationAsRead as markFirebaseNotificationAsRead,
  markAllNotificationsAsRead as markFirebaseAllNotificationsAsRead,
  getUsers,
} from "./firebase-actions"
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

let notificationsCache: { data: Notification[]; timestamp: number } | null = null
const CACHE_TTL = 300000 // 5 minutes

async function getCachedNotifications(): Promise<Notification[]> {
  const now = Date.now()
  if (notificationsCache && now - notificationsCache.timestamp < CACHE_TTL) {
    return notificationsCache.data
  }

  try {
    const allNotifications = await getFirebaseNotifications()
    notificationsCache = { data: allNotifications, timestamp: now }
    return allNotifications
  } catch (error) {
    console.error("[Notification] Error getting cached notifications:", error)
    // Return stale cache if available
    return notificationsCache?.data || []
  }
}

// Get notifications for a user
export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const allNotifications = await getCachedNotifications()
    return allNotifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)
  } catch (error) {
    console.error("[Notification] Error getting notifications:", error)
    return []
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const allNotifications = await getCachedNotifications()
    return allNotifications.filter((n) => n.userId === userId && !n.isRead).length
  } catch (error) {
    console.error("[Notification] Error getting unread count:", error)
    return 0
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await markFirebaseNotificationAsRead(notificationId)
    notificationsCache = null // Invalidate cache
  } catch (error) {
    console.error("[Notification] Error marking as read:", error)
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await markFirebaseAllNotificationsAsRead(userId)
    notificationsCache = null // Invalidate cache
  } catch (error) {
    console.error("[Notification] Error marking all as read:", error)
  }
}

export async function createNotification(
  notification: Omit<Notification, "id" | "createdAt" | "isRead">,
): Promise<void> {
  try {
    await createFirebaseNotification({
      ...notification,
      isRead: false,
    })
    notificationsCache = null // Invalidate cache
  } catch (error) {
    console.error("[Notification] Error creating notification:", error)
  }
}

let usersCache: { data: any[]; timestamp: number } | null = null
const USERS_CACHE_TTL = 300000 // 5 minutes

async function getCachedUsers(): Promise<any[]> {
  const now = Date.now()
  if (usersCache && now - usersCache.timestamp < USERS_CACHE_TTL) {
    return usersCache.data
  }

  try {
    const users = await getUsers()
    usersCache = { data: users, timestamp: now }
    return users
  } catch (error) {
    return usersCache?.data || []
  }
}

// Get users by role for sending notifications
export async function getUsersByRole(role: UserRole): Promise<{ id: string; namaLengkap: string }[]> {
  try {
    const users = await getCachedUsers()
    return users.filter((u) => u.role === role && u.isActive).map((u) => ({ id: u.id, namaLengkap: u.namaLengkap }))
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
