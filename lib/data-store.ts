import type { User, Program, Order, SimulasiKredit, Aktivitas, OrderNote, Merk, Dealer, Notification } from "./types"
import {
  getUsers as dbGetUsers,
  getUserById as dbGetUserById,
  getUserByUsername as dbGetUserByUsername,
  getUsersByRole as dbGetUsersByRole,
  createUser as dbCreateUser,
  updateUser as dbUpdateUser,
  deleteUser as dbDeleteUser,
  getPrograms as dbGetPrograms,
  createProgram as dbCreateProgram,
  updateProgram as dbUpdateProgram,
  deleteProgram as dbDeleteProgram,
  getOrders as dbGetOrders,
  getOrderById as dbGetOrderById,
  createOrder as dbCreateOrder,
  updateOrder as dbUpdateOrder,
  deleteOrder as dbDeleteOrder,
  createOrderNote as dbCreateOrderNote,
  getOrderNotesByOrderId as dbGetOrderNotesByOrderId,
  getAllOrderNotes as dbGetAllOrderNotes,
  createSimulasi as dbCreateSimulasi,
  getSimulasiByUserId as dbGetSimulasiByUserId,
  getSimulasi as dbGetSimulasi,
  createAktivitas as dbCreateAktivitas,
  getAktivitasByUserId as dbGetAktivitasByUserId,
  getAktivitas as dbGetAktivitas,
  deleteAktivitas as dbDeleteAktivitas,
  getMerks as dbGetMerks,
  createMerk as dbCreateMerk,
  updateMerk as dbUpdateMerk,
  deleteMerk as dbDeleteMerk,
  getDealers as dbGetDealers,
  createDealer as dbCreateDealer,
  updateDealer as dbUpdateDealer,
  deleteDealer as dbDeleteDealer,
  getNotifications as dbGetNotifications,
  createNotification as dbCreateNotification,
  markNotificationAsRead as dbMarkNotificationAsRead,
  markAllNotificationsAsRead as dbMarkAllNotificationsAsRead,
  initializeDefaultData as dbInitializeDefaultData,
} from "@/app/actions/db-actions"

// Helper untuk generate ID
export function generateId(): string {
  return crypto.randomUUID()
}

// Helper untuk generate username
export function generateUsername(namaLengkap: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz"
  const nums = "0123456789"
  let suffix = ""
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  for (let i = 0; i < 3; i++) {
    suffix += nums.charAt(Math.floor(Math.random() * nums.length))
  }
  const cleanName = namaLengkap.toLowerCase().replace(/\s+/g, "_")
  return `${cleanName}_${suffix}`
}

// Local Storage Keys for session only
const STORAGE_KEYS = {
  CURRENT_USER: "muf_current_user",
}

// Helper to map DB user to app User type
function mapDbUserToUser(dbUser: any): User {
  if (!dbUser) return null as any
  return {
    id: dbUser.id,
    username: dbUser.username,
    password: dbUser.password,
    namaLengkap: dbUser.namaLengkap || dbUser.nama_lengkap,
    nomorHp: dbUser.nomorHp || dbUser.noHp || dbUser.no_hp || "",
    role: dbUser.role,
    merk: Array.isArray(dbUser.merk) ? dbUser.merk : dbUser.merk ? [dbUser.merk] : [],
    dealer: dbUser.dealer,
    jabatan: dbUser.jabatan,
    isFirstLogin: dbUser.isFirstLogin ?? dbUser.is_first_login ?? false,
    passwordLastChanged: dbUser.passwordLastChanged || dbUser.password_last_changed,
    isActive: dbUser.isActive ?? dbUser.is_active ?? true,
    createdAt: dbUser.createdAt || dbUser.created_at,
    spvId: dbUser.spvId || dbUser.spv_id || "",
    spvName: dbUser.spvName || dbUser.spv_name || "",
    cmhId: dbUser.cmhId || dbUser.cmh_id || "",
    cmhName: dbUser.cmhName || dbUser.cmh_name || "",
  }
}

// ==================== NEON DATABASE STORES ====================

// User Store - Uses Neon directly
export const userStore = {
  getAll: async (): Promise<User[]> => {
    try {
      const users = await dbGetUsers()
      return Array.isArray(users) ? users.map(mapDbUserToUser).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting users:", error)
      return []
    }
  },

  getById: async (id: string): Promise<User | null> => {
    try {
      if (!id) return null
      const user = await dbGetUserById(id)
      return user ? mapDbUserToUser(user) : null
    } catch (error) {
      console.error("[v0] Error getting user by id:", error)
      return null
    }
  },

  getByUsername: async (username: string): Promise<User | null> => {
    try {
      if (!username) return null
      const user = await dbGetUserByUsername(username)
      return user ? mapDbUserToUser(user) : null
    } catch (error) {
      console.error("[v0] Error getting user by username:", error)
      return null
    }
  },

  getByRole: async (role: string): Promise<User[]> => {
    try {
      if (!role) return []
      const users = await dbGetUsersByRole(role)
      return Array.isArray(users) ? users.map(mapDbUserToUser).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting users by role:", error)
      return []
    }
  },

  add: async (userData: Omit<User, "id" | "createdAt">): Promise<User> => {
    try {
      const user = await dbCreateUser(userData)
      return mapDbUserToUser(user)
    } catch (error) {
      console.error("[v0] Error creating user:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<User>): Promise<void> => {
    try {
      if (!id) return
      await dbUpdateUser(id, updates)
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await dbDeleteUser(id)
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      throw error
    }
  },
}

// Program Store - Uses Neon
export const programStore = {
  getAll: async (): Promise<Program[]> => {
    try {
      const programs = await dbGetPrograms()
      return Array.isArray(programs) ? programs : []
    } catch (error) {
      console.error("[v0] Error getting programs:", error)
      return []
    }
  },

  add: async (programData: Omit<Program, "id" | "createdAt" | "updatedAt">): Promise<Program> => {
    try {
      return await dbCreateProgram(programData)
    } catch (error) {
      console.error("[v0] Error creating program:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Program>): Promise<void> => {
    try {
      if (!id) return
      await dbUpdateProgram(id, updates)
    } catch (error) {
      console.error("[v0] Error updating program:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await dbDeleteProgram(id)
    } catch (error) {
      console.error("[v0] Error deleting program:", error)
      throw error
    }
  },
}

// Order Store - Uses Neon
export const orderStore = {
  getAll: async (): Promise<Order[]> => {
    try {
      const orders = await dbGetOrders()
      return Array.isArray(orders) ? orders : []
    } catch (error) {
      console.error("[v0] Error getting orders:", error)
      return []
    }
  },

  getById: async (id: string): Promise<Order | null> => {
    try {
      if (!id) return null
      return await dbGetOrderById(id)
    } catch (error) {
      console.error("[v0] Error getting order by id:", error)
      return null
    }
  },

  getByCmoId: async (cmoId: string, cmoUsername?: string, cmoName?: string): Promise<Order[]> => {
    try {
      const allOrders = await dbGetOrders()
      if (!Array.isArray(allOrders)) return []

      return allOrders.filter((order: Order) => {
        if (order.cmoId === cmoId) return true
        if (cmoUsername && order.cmoId === cmoUsername) return true
        if (cmoName && order.cmoName === cmoName) return true
        return false
      })
    } catch (error) {
      console.error("[v0] Error getting orders by CMO:", error)
      return []
    }
  },

  add: async (orderData: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> => {
    try {
      return await dbCreateOrder(orderData)
    } catch (error) {
      console.error("[v0] Error creating order:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Order>): Promise<void> => {
    try {
      if (!id) return
      await dbUpdateOrder(id, updates)
    } catch (error) {
      console.error("[v0] Error updating order:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await dbDeleteOrder(id)
    } catch (error) {
      console.error("[v0] Error deleting order:", error)
      throw error
    }
  },
}

// Simulasi Store - Uses Neon
export const simulasiStore = {
  getAll: async (): Promise<SimulasiKredit[]> => {
    try {
      const simulasi = await dbGetSimulasi()
      return Array.isArray(simulasi) ? simulasi : []
    } catch (error) {
      console.error("[v0] Error getting simulasi:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<SimulasiKredit[]> => {
    try {
      if (!userId) return []
      const simulasi = await dbGetSimulasiByUserId(userId)
      return Array.isArray(simulasi) ? simulasi : []
    } catch (error) {
      console.error("[v0] Error getting simulasi by user:", error)
      return []
    }
  },

  add: async (data: Omit<SimulasiKredit, "id" | "createdAt">): Promise<SimulasiKredit> => {
    try {
      return await dbCreateSimulasi(data)
    } catch (error) {
      console.error("[v0] Error creating simulasi:", error)
      throw error
    }
  },
}

// Aktivitas Store - Uses Neon
export const aktivitasStore = {
  getAll: async (): Promise<Aktivitas[]> => {
    try {
      const aktivitas = await dbGetAktivitas()
      return Array.isArray(aktivitas) ? aktivitas : []
    } catch (error) {
      console.error("[v0] Error getting aktivitas:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<Aktivitas[]> => {
    try {
      if (!userId) return []
      const aktivitas = await dbGetAktivitasByUserId(userId)
      return Array.isArray(aktivitas) ? aktivitas : []
    } catch (error) {
      console.error("[v0] Error getting aktivitas by user:", error)
      return []
    }
  },

  add: async (data: Omit<Aktivitas, "id" | "createdAt">): Promise<Aktivitas> => {
    try {
      return await dbCreateAktivitas(data)
    } catch (error) {
      console.error("[v0] Error creating aktivitas:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await dbDeleteAktivitas(id)
    } catch (error) {
      console.error("[v0] Error deleting aktivitas:", error)
      throw error
    }
  },
}

// Merk Store - Uses Neon
export const merkStore = {
  getAll: async (): Promise<Merk[]> => {
    try {
      const merks = await dbGetMerks()
      return Array.isArray(merks) ? merks : []
    } catch (error) {
      console.error("[v0] Error getting merks:", error)
      return []
    }
  },

  add: async (data: Omit<Merk, "id" | "createdAt">): Promise<Merk> => {
    try {
      return await dbCreateMerk(data)
    } catch (error) {
      console.error("[v0] Error creating merk:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Merk>): Promise<void> => {
    try {
      if (!id) return
      await dbUpdateMerk(id, updates)
    } catch (error) {
      console.error("[v0] Error updating merk:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await dbDeleteMerk(id)
    } catch (error) {
      console.error("[v0] Error deleting merk:", error)
      throw error
    }
  },
}

// Dealer Store - Uses Neon
export const dealerStore = {
  getAll: async (): Promise<Dealer[]> => {
    try {
      const dealers = await dbGetDealers()
      return Array.isArray(dealers) ? dealers : []
    } catch (error) {
      console.error("[v0] Error getting dealers:", error)
      return []
    }
  },

  add: async (data: Omit<Dealer, "id" | "createdAt">): Promise<Dealer> => {
    try {
      return await dbCreateDealer(data)
    } catch (error) {
      console.error("[v0] Error creating dealer:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Dealer>): Promise<void> => {
    try {
      if (!id) return
      await dbUpdateDealer(id, updates)
    } catch (error) {
      console.error("[v0] Error updating dealer:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await dbDeleteDealer(id)
    } catch (error) {
      console.error("[v0] Error deleting dealer:", error)
      throw error
    }
  },
}

// Notification Store - Uses Neon
export const notificationStore = {
  getAll: async (): Promise<Notification[]> => {
    try {
      const notifications = await dbGetNotifications()
      return Array.isArray(notifications) ? notifications : []
    } catch (error) {
      console.error("[v0] Error getting notifications:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<Notification[]> => {
    try {
      if (!userId) return []
      const notifications = await dbGetNotifications()
      if (!Array.isArray(notifications)) return []
      return notifications.filter((n: Notification) => n.userId === userId)
    } catch (error) {
      console.error("[v0] Error getting notifications by user:", error)
      return []
    }
  },

  add: async (data: Omit<Notification, "id" | "createdAt">): Promise<Notification> => {
    try {
      return await dbCreateNotification(data)
    } catch (error) {
      console.error("[v0] Error creating notification:", error)
      throw error
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await dbMarkNotificationAsRead(id)
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
      throw error
    }
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      if (!userId) return
      await dbMarkAllNotificationsAsRead(userId)
    } catch (error) {
      console.error("[v0] Error marking all notifications as read:", error)
      throw error
    }
  },
}

// Note Store - Uses Neon
export const noteStore = {
  getAll: async (): Promise<OrderNote[]> => {
    try {
      const notes = await dbGetAllOrderNotes()
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("[v0] Error getting all notes:", error)
      return []
    }
  },

  getByOrderId: async (orderId: string): Promise<OrderNote[]> => {
    try {
      if (!orderId) return []
      const notes = await dbGetOrderNotesByOrderId(orderId)
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("[v0] Error getting notes by order:", error)
      return []
    }
  },

  add: async (data: Omit<OrderNote, "id" | "createdAt">): Promise<OrderNote> => {
    try {
      return await dbCreateOrderNote(data)
    } catch (error) {
      console.error("[v0] Error creating note:", error)
      throw error
    }
  },
}

// Session Store - Local storage for current user session
export const sessionStore = {
  get: (): User | null => {
    if (typeof window === "undefined") return null
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER)
      if (stored) {
        const parsed = JSON.parse(stored)
        return mapDbUserToUser(parsed)
      }
      return null
    } catch {
      return null
    }
  },

  set: (user: User): void => {
    if (typeof window === "undefined") return
    try {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
    } catch {}
  },

  clear: (): void => {
    if (typeof window === "undefined") return
    try {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
    } catch {}
  },
}

// Export initialize function from db-actions (Neon)
export const initializeDefaultData = dbInitializeDefaultData
