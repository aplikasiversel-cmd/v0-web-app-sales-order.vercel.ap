"use server"

import { neon } from "@neondatabase/serverless"
import type { UserRole } from "@/lib/types"

function getSQL() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("[DB] DATABASE_URL is not defined")
    return null
  }
  return neon(connectionString)
}

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

// Helper to convert Date to ISO string
function toISOString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString()
  if (date instanceof Date) return date.toISOString()
  if (typeof date === "string") return date
  return new Date().toISOString()
}

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T | null> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      console.error(`[DB] Attempt ${i + 1} failed:`, error)
      if (i === maxRetries) {
        return null
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)))
    }
  }
  return null
}

// Get notifications for a user
export async function getNotifications(userId: string): Promise<Notification[]> {
  const sql = getSQL()
  if (!sql) return []

  const result = await withRetry(async () => {
    const rows = await sql`
      SELECT * FROM notifications 
      WHERE user_id = ${userId}::TEXT 
      ORDER BY created_at DESC 
      LIMIT 50
    `
    return rows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      title: row.title as string,
      message: row.message as string,
      type: row.type as Notification["type"],
      referenceId: (row.reference_id as string) || undefined,
      isRead: row.is_read as boolean,
      createdAt: toISOString(row.created_at as Date | string),
      createdById: (row.created_by_id as string) || undefined,
      createdByName: (row.created_by_name as string) || undefined,
    }))
  })

  return result || []
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const sql = getSQL()
  if (!sql) return 0

  const result = await withRetry(async () => {
    const rows = await sql`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ${userId}::TEXT AND is_read = FALSE
    `
    return Number(rows[0]?.count || 0)
  })

  return result || 0
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const sql = getSQL()
  if (!sql) return

  await withRetry(async () => {
    await sql`
      UPDATE notifications SET is_read = TRUE WHERE id = ${notificationId}::TEXT
    `
    return true
  })
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const sql = getSQL()
  if (!sql) return

  await withRetry(async () => {
    await sql`
      UPDATE notifications SET is_read = TRUE WHERE user_id = ${userId}::TEXT
    `
    return true
  })
}

// Create a notification
export async function createNotification(
  notification: Omit<Notification, "id" | "createdAt" | "isRead">,
): Promise<void> {
  const sql = getSQL()
  if (!sql) return

  await withRetry(async () => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id, is_read, created_at, created_by_id, created_by_name)
      VALUES (
        ${id}::TEXT, 
        ${notification.userId}::TEXT, 
        ${notification.title}, 
        ${notification.message}, 
        ${notification.type}, 
        ${notification.referenceId || null}::TEXT, 
        FALSE, 
        ${now}::TIMESTAMP,
        ${notification.createdById || null}::TEXT,
        ${notification.createdByName || null}
      )
    `
    return true
  })
}

// Get users by role for sending notifications
export async function getUsersByRole(role: UserRole): Promise<{ id: string; namaLengkap: string }[]> {
  const sql = getSQL()
  if (!sql) return []

  const result = await withRetry(async () => {
    const rows = await sql`
      SELECT id, nama_lengkap FROM users WHERE role = ${role} AND is_active = TRUE
    `
    return rows.map((row) => ({
      id: row.id as string,
      namaLengkap: row.nama_lengkap as string,
    }))
  })

  return result || []
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
    // Get all CMH users
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
    console.error("[DB] notifySlikOrDecision error:", error)
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

    // Get all CMH users
    const cmhUsers = await getUsersByRole("cmh")

    // Notify specific CMO if assigned
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

    // Notify all CMH
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
    console.error("[DB] notifyNewOrder error:", error)
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

    // Get all CMH users
    const cmhUsers = await getUsersByRole("cmh")

    // Notify all CMH
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
    console.error("[DB] notifyNewActivity error:", error)
  }
}
