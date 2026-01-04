import type { User, Program, Order, SimulasiKredit, Aktivitas, OrderNote, Merk, Dealer, Notification } from "./types"
import {
  getUsers as fbGetUsers,
  getUserById as fbGetUserById,
  getUserByUsername as fbGetUserByUsername,
  getUsersByRole as fbGetUsersByRole,
  createUser as fbCreateUser,
  updateUser as fbUpdateUser,
  deleteUser as fbDeleteUser,
  getPrograms as fbGetPrograms,
  createProgram as fbCreateProgram,
  updateProgram as fbUpdateProgram,
  deleteProgram as fbDeleteProgram,
  getOrders as fbGetOrders,
  getOrderById as fbGetOrderById,
  createOrder as fbCreateOrder,
  updateOrder as fbUpdateOrder,
  deleteOrder as fbDeleteOrder,
  createOrderNote as fbCreateOrderNote,
  getOrderNotesByOrderId as fbGetOrderNotesByOrderId,
  getAllOrderNotes as fbGetAllOrderNotes,
  createSimulasi as fbCreateSimulasi,
  getSimulasiByUserId as fbGetSimulasiByUserId,
  getSimulasi as fbGetSimulasi,
  createAktivitas as fbCreateAktivitas,
  getAktivitasByUserId as fbGetAktivitasByUserId,
  getAktivitas as fbGetAktivitas,
  deleteAktivitas as fbDeleteAktivitas,
  getMerks as fbGetMerks,
  createMerk as fbCreateMerk,
  updateMerk as fbUpdateMerk,
  deleteMerk as fbDeleteMerk,
  getDealers as fbGetDealers,
  createDealer as fbCreateDealer,
  updateDealer as fbUpdateDealer,
  deleteDealer as fbDeleteDealer,
  getNotifications as fbGetNotifications,
  createNotification as fbCreateNotification,
  markNotificationAsRead as fbMarkNotificationAsRead,
  markAllNotificationsAsRead as fbMarkAllNotificationsAsRead,
  initializeDefaultData as fbInitializeDefaultData,
} from "@/app/actions/firebase-actions"

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

// Helper to map user
function mapUser(user: any): User {
  if (!user) return null as any
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    namaLengkap: user.namaLengkap || user.nama_lengkap,
    nomorHp: user.nomorHp || user.noHp || user.no_hp || "",
    role: user.role,
    merk: Array.isArray(user.merk) ? user.merk : user.merk ? [user.merk] : [],
    dealer: user.dealer,
    jabatan: user.jabatan,
    isFirstLogin: user.isFirstLogin ?? user.is_first_login ?? false,
    passwordLastChanged: user.passwordLastChanged || user.password_last_changed,
    isActive: user.isActive ?? user.is_active ?? true,
    createdAt: user.createdAt || user.created_at,
    spvId: user.spvId || user.spv_id || "",
    spvName: user.spvName || user.spv_name || "",
    cmhId: user.cmhId || user.cmh_id || "",
    cmhName: user.cmhName || user.cmh_name || "",
  }
}

// ==================== FIREBASE STORES ====================

// User Store - Uses Firebase
export const userStore = {
  getAll: async (): Promise<User[]> => {
    try {
      const users = await fbGetUsers()
      return Array.isArray(users) ? users.map(mapUser).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting users:", error)
      return []
    }
  },

  getById: async (id: string): Promise<User | null> => {
    try {
      if (!id) return null
      const user = await fbGetUserById(id)
      return user ? mapUser(user) : null
    } catch (error) {
      console.error("[v0] Error getting user by id:", error)
      return null
    }
  },

  getByUsername: async (username: string): Promise<User | null> => {
    try {
      if (!username) return null
      const user = await fbGetUserByUsername(username)
      return user ? mapUser(user) : null
    } catch (error) {
      console.error("[v0] Error getting user by username:", error)
      return null
    }
  },

  getByRole: async (role: string): Promise<User[]> => {
    try {
      if (!role) return []
      const users = await fbGetUsersByRole(role)
      return Array.isArray(users) ? users.map(mapUser).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting users by role:", error)
      return []
    }
  },

  add: async (userData: Omit<User, "id" | "createdAt">): Promise<User> => {
    try {
      const user = await fbCreateUser(userData as any)
      return mapUser(user)
    } catch (error) {
      console.error("[v0] Error creating user:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<User>): Promise<void> => {
    try {
      if (!id) return
      await fbUpdateUser(id, updates)
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await fbDeleteUser(id)
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      throw error
    }
  },
}

// Program Store - Uses Firebase
export const programStore = {
  getAll: async (): Promise<Program[]> => {
    try {
      const programs = await fbGetPrograms()
      return Array.isArray(programs) ? programs : []
    } catch (error) {
      console.error("[v0] Error getting programs:", error)
      return []
    }
  },

  add: async (programData: Omit<Program, "id" | "createdAt" | "updatedAt">): Promise<Program> => {
    try {
      return await fbCreateProgram(programData as any)
    } catch (error) {
      console.error("[v0] Error creating program:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Program>): Promise<void> => {
    try {
      if (!id) return
      await fbUpdateProgram(id, updates)
    } catch (error) {
      console.error("[v0] Error updating program:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await fbDeleteProgram(id)
    } catch (error) {
      console.error("[v0] Error deleting program:", error)
      throw error
    }
  },
}

// Order Store - Uses Firebase
export const orderStore = {
  getAll: async (): Promise<Order[]> => {
    try {
      const orders = await fbGetOrders()
      return Array.isArray(orders) ? orders : []
    } catch (error) {
      console.error("[v0] Error getting orders:", error)
      return []
    }
  },

  getById: async (id: string): Promise<Order | null> => {
    try {
      if (!id) return null
      return await fbGetOrderById(id)
    } catch (error) {
      console.error("[v0] Error getting order by id:", error)
      return null
    }
  },

  getByCmoId: async (cmoId: string, cmoUsername?: string, cmoName?: string): Promise<Order[]> => {
    try {
      const allOrders = await fbGetOrders()
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
      return await fbCreateOrder(orderData as any)
    } catch (error) {
      console.error("[v0] Error creating order:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Order>): Promise<void> => {
    try {
      if (!id) return
      await fbUpdateOrder(id, updates)
    } catch (error) {
      console.error("[v0] Error updating order:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await fbDeleteOrder(id)
    } catch (error) {
      console.error("[v0] Error deleting order:", error)
      throw error
    }
  },
}

// Simulasi Store - Uses Firebase
export const simulasiStore = {
  getAll: async (): Promise<SimulasiKredit[]> => {
    try {
      const simulasi = await fbGetSimulasi()
      return Array.isArray(simulasi) ? simulasi : []
    } catch (error) {
      console.error("[v0] Error getting simulasi:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<SimulasiKredit[]> => {
    try {
      if (!userId) return []
      const simulasi = await fbGetSimulasiByUserId(userId)
      return Array.isArray(simulasi) ? simulasi : []
    } catch (error) {
      console.error("[v0] Error getting simulasi by user:", error)
      return []
    }
  },

  add: async (data: Omit<SimulasiKredit, "id" | "createdAt">): Promise<SimulasiKredit> => {
    try {
      return await fbCreateSimulasi(data as any)
    } catch (error) {
      console.error("[v0] Error creating simulasi:", error)
      throw error
    }
  },
}

// Aktivitas Store - Uses Firebase
export const aktivitasStore = {
  getAll: async (): Promise<Aktivitas[]> => {
    try {
      const aktivitas = await fbGetAktivitas()
      return Array.isArray(aktivitas) ? aktivitas : []
    } catch (error) {
      console.error("[v0] Error getting aktivitas:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<Aktivitas[]> => {
    try {
      if (!userId) return []
      const aktivitas = await fbGetAktivitasByUserId(userId)
      return Array.isArray(aktivitas) ? aktivitas : []
    } catch (error) {
      console.error("[v0] Error getting aktivitas by user:", error)
      return []
    }
  },

  add: async (data: Omit<Aktivitas, "id" | "createdAt">): Promise<Aktivitas> => {
    try {
      return await fbCreateAktivitas(data as any)
    } catch (error) {
      console.error("[v0] Error creating aktivitas:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await fbDeleteAktivitas(id)
    } catch (error) {
      console.error("[v0] Error deleting aktivitas:", error)
      throw error
    }
  },
}

// Merk Store - Uses Firebase
export const merkStore = {
  getAll: async (): Promise<Merk[]> => {
    try {
      const merks = await fbGetMerks()
      return Array.isArray(merks) ? merks : []
    } catch (error) {
      console.error("[v0] Error getting merks:", error)
      return []
    }
  },

  add: async (data: Omit<Merk, "id" | "createdAt">): Promise<Merk> => {
    try {
      return await fbCreateMerk(data as any)
    } catch (error) {
      console.error("[v0] Error creating merk:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Merk>): Promise<void> => {
    try {
      if (!id) return
      await fbUpdateMerk(id, updates)
    } catch (error) {
      console.error("[v0] Error updating merk:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await fbDeleteMerk(id)
    } catch (error) {
      console.error("[v0] Error deleting merk:", error)
      throw error
    }
  },
}

// Dealer Store - Uses Firebase
export const dealerStore = {
  getAll: async (): Promise<Dealer[]> => {
    try {
      const dealers = await fbGetDealers()
      return Array.isArray(dealers) ? dealers : []
    } catch (error) {
      console.error("[v0] Error getting dealers:", error)
      return []
    }
  },

  add: async (data: Omit<Dealer, "id" | "createdAt">): Promise<Dealer> => {
    try {
      return await fbCreateDealer(data as any)
    } catch (error) {
      console.error("[v0] Error creating dealer:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Dealer>): Promise<void> => {
    try {
      if (!id) return
      await fbUpdateDealer(id, updates)
    } catch (error) {
      console.error("[v0] Error updating dealer:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await fbDeleteDealer(id)
    } catch (error) {
      console.error("[v0] Error deleting dealer:", error)
      throw error
    }
  },
}

// Notification Store - Uses Firebase
export const notificationStore = {
  getAll: async (): Promise<Notification[]> => {
    try {
      const notifications = await fbGetNotifications()
      return Array.isArray(notifications) ? notifications : []
    } catch (error) {
      console.error("[v0] Error getting notifications:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<Notification[]> => {
    try {
      if (!userId) return []
      const notifications = await fbGetNotifications()
      if (!Array.isArray(notifications)) return []
      return notifications.filter((n: Notification) => n.userId === userId)
    } catch (error) {
      console.error("[v0] Error getting notifications by user:", error)
      return []
    }
  },

  add: async (data: Omit<Notification, "id" | "createdAt">): Promise<Notification> => {
    try {
      return await fbCreateNotification(data as any)
    } catch (error) {
      console.error("[v0] Error creating notification:", error)
      throw error
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await fbMarkNotificationAsRead(id)
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
      throw error
    }
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      if (!userId) return
      await fbMarkAllNotificationsAsRead(userId)
    } catch (error) {
      console.error("[v0] Error marking all notifications as read:", error)
      throw error
    }
  },
}

// Note Store - Uses Firebase
export const noteStore = {
  getAll: async (): Promise<OrderNote[]> => {
    try {
      const notes = await fbGetAllOrderNotes()
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("[v0] Error getting all notes:", error)
      return []
    }
  },

  getByOrderId: async (orderId: string): Promise<OrderNote[]> => {
    try {
      if (!orderId) return []
      const notes = await fbGetOrderNotesByOrderId(orderId)
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("[v0] Error getting notes by order:", error)
      return []
    }
  },

  add: async (data: Omit<OrderNote, "id" | "createdAt">): Promise<OrderNote> => {
    try {
      return await fbCreateOrderNote(data as any)
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
        return mapUser(parsed)
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

// Export initialize function from Firebase
export const initializeDefaultData = fbInitializeDefaultData
