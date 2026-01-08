import type { User, Program, Order, SimulasiKredit, Aktivitas, OrderNote, Merk, Dealer, Notification } from "./types"

// Import ALL functions from Firebase
import {
  getUsers as firebaseGetUsers,
  getUserById as firebaseGetUserById,
  getUserByUsername as firebaseGetUserByUsername,
  getUsersByRole as firebaseGetUsersByRole,
  createUser as firebaseCreateUser,
  updateUser as firebaseUpdateUser,
  deleteUser as firebaseDeleteUser,
  getPrograms as firebaseGetPrograms,
  createProgram as firebaseCreateProgram,
  updateProgram as firebaseUpdateProgram,
  deleteProgram as firebaseDeleteProgram,
  getOrders as firebaseGetOrders,
  getOrderById as firebaseGetOrderById,
  getOrdersByCmoId as firebaseGetOrdersByCmoId,
  createOrder as firebaseCreateOrder,
  updateOrder as firebaseUpdateOrder,
  deleteOrder as firebaseDeleteOrder,
  createSimulasi as firebaseCreateSimulasi,
  getSimulasiByUserId as firebaseGetSimulasiByUserId,
  getSimulasi as firebaseGetSimulasi,
  createAktivitas as firebaseCreateAktivitas,
  getAktivitasByUserId as firebaseGetAktivitasByUserId,
  getAktivitas as firebaseGetAktivitas,
  deleteAktivitas as firebaseDeleteAktivitas,
  getMerks as firebaseGetMerks,
  createMerk as firebaseCreateMerk,
  updateMerk as firebaseUpdateMerk,
  deleteMerk as firebaseDeleteMerk,
  getDealers as firebaseGetDealers,
  createDealer as firebaseCreateDealer,
  updateDealer as firebaseUpdateDealer,
  deleteDealer as firebaseDeleteDealer,
  getNotifications as firebaseGetNotifications,
  getNotificationsByUserId as firebaseGetNotificationsByUserId,
  createNotification as firebaseCreateNotification,
  markNotificationAsRead as firebaseMarkNotificationAsRead,
  markAllNotificationsAsRead as firebaseMarkAllNotificationsAsRead,
  createOrderNote as firebaseCreateOrderNote,
  getOrderNotesByOrderId as firebaseGetOrderNotesByOrderId,
  getAllOrderNotes as firebaseGetAllOrderNotes,
  initializeDefaultData as firebaseInitializeDefaultData,
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

// Helper to map order
function mapOrder(order: any): Order {
  if (!order) return null as any
  return {
    id: order.id,
    salesId: order.salesId || order.sales_id,
    salesName: order.salesName || order.sales_name || "",
    namaNasabah: order.namaNasabah || order.nama_nasabah || "",
    fotoKtpNasabah: order.fotoKtpNasabah || order.foto_ktp_nasabah,
    namaPasangan: order.namaPasangan || order.nama_pasangan,
    fotoKtpPasangan: order.fotoKtpPasangan || order.foto_ktp_pasangan,
    fotoKk: order.fotoKk || order.fotoKK || order.foto_kk,
    noHp: order.noHp || order.no_hp || "",
    typeUnit: order.typeUnit || order.type_unit || "",
    merk: order.merk || "",
    dealer: order.dealer || "",
    jenisPembiayaan: order.jenisPembiayaan || order.jenis_pembiayaan || "",
    namaProgram: order.namaProgram || order.nama_program || "",
    otr: order.otr || 0,
    tdp: order.tdp || 0,
    angsuran: order.angsuran || 0,
    tenor: order.tenor || 0,
    cmoId: order.cmoId || order.cmo_id,
    cmoName: order.cmoName || order.cmo_name,
    catatanKhusus: order.catatanKhusus || order.catatan_khusus,
    status: order.status || "Baru",
    hasilSlik: order.hasilSlik || order.hasil_slik,
    tanggalSurvey: order.tanggalSurvey || order.tanggal_survey,
    fotoSurvey: order.fotoSurvey || order.foto_survey || [],
    checklist: order.checklist || undefined,
    claimedBy: order.claimedBy || order.claimed_by,
    claimedAt: order.claimedAt || order.claimed_at,
    createdAt: order.createdAt || order.created_at || new Date().toISOString(),
    updatedAt: order.updatedAt || order.updated_at,
    notes: order.notes || [],
  }
}

// Helper to map program
function mapProgram(program: any): Program {
  if (!program) return null as any
  return {
    id: program.id,
    namaProgram: program.namaProgram || program.nama_program,
    merk: program.merk,
    jenisPembiayaan: program.jenisPembiayaan || program.jenis_pembiayaan,
    tdpPersen: program.tdpPersen || program.tdp_persen,
    tenorBunga: program.tenorBunga || program.tenor_bunga || [],
    isActive: program.isActive ?? program.is_active ?? true,
    createdAt: program.createdAt || program.created_at,
    updatedAt: program.updatedAt || program.updated_at,
  }
}

// Helper to map notification
function mapNotification(notification: any): Notification {
  if (!notification) return null as any
  return {
    id: notification.id,
    userId: notification.userId || notification.user_id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    referenceId: notification.referenceId || notification.reference_id || notification.relatedOrderId,
    isRead: notification.isRead ?? notification.is_read ?? false,
    createdAt: notification.createdAt || notification.created_at,
    createdById: notification.createdById || notification.created_by_id,
    createdByName: notification.createdByName || notification.created_by_name,
  }
}

// ==================== USER STORE (FIREBASE) ====================

export const userStore = {
  getAll: async (): Promise<User[]> => {
    try {
      const users = await firebaseGetUsers()
      return Array.isArray(users) ? users.map(mapUser).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting users:", error)
      return []
    }
  },

  getById: async (id: string): Promise<User | null> => {
    try {
      if (!id) return null
      const user = await firebaseGetUserById(id)
      return user ? mapUser(user) : null
    } catch (error) {
      console.error("[v0] Error getting user by id:", error)
      return null
    }
  },

  getByUsername: async (username: string): Promise<User | null> => {
    try {
      if (!username) return null
      const user = await firebaseGetUserByUsername(username)
      return user ? mapUser(user) : null
    } catch (error) {
      console.error("[v0] Error getting user by username:", error)
      return null
    }
  },

  getByRole: async (role: string): Promise<User[]> => {
    try {
      if (!role) return []
      const users = await firebaseGetUsersByRole(role)
      return Array.isArray(users) ? users.map(mapUser).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting users by role:", error)
      return []
    }
  },

  add: async (userData: Omit<User, "id" | "createdAt">): Promise<User> => {
    try {
      const user = await firebaseCreateUser(userData as any)
      return mapUser(user)
    } catch (error) {
      console.error("[v0] Error creating user:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<User>): Promise<void> => {
    try {
      if (!id) return
      await firebaseUpdateUser(id, updates)
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await firebaseDeleteUser(id)
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      throw error
    }
  },
}

// ==================== DATA STORES (ALL FIREBASE) ====================

// Program Store - Uses Firebase
export const programStore = {
  getAll: async (): Promise<Program[]> => {
    try {
      const programs = await firebaseGetPrograms()
      return Array.isArray(programs) ? programs.map(mapProgram).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting programs:", error)
      return []
    }
  },

  add: async (programData: Omit<Program, "id" | "createdAt" | "updatedAt">): Promise<Program> => {
    try {
      const program = await firebaseCreateProgram(programData as any)
      return mapProgram(program)
    } catch (error) {
      console.error("[v0] Error creating program:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Program>): Promise<void> => {
    try {
      if (!id) return
      await firebaseUpdateProgram(id, updates)
    } catch (error) {
      console.error("[v0] Error updating program:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await firebaseDeleteProgram(id)
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
      console.log("[v0] orderStore.getAll - calling firebaseGetOrders")
      const orders = await firebaseGetOrders()
      console.log("[v0] orderStore.getAll - received orders:", orders?.length || 0)

      if (!Array.isArray(orders)) {
        console.log("[v0] orderStore.getAll - orders is not an array:", typeof orders)
        return []
      }

      const mappedOrders = orders.map(mapOrder).filter(Boolean)
      console.log("[v0] orderStore.getAll - mapped orders:", mappedOrders.length)
      return mappedOrders
    } catch (error) {
      console.error("[v0] orderStore.getAll - Error:", error)
      return []
    }
  },

  getById: async (id: string): Promise<Order | null> => {
    try {
      if (!id) return null
      const order = await firebaseGetOrderById(id)
      return order ? mapOrder(order) : null
    } catch (error) {
      console.error("[v0] Error getting order by id:", error)
      return null
    }
  },

  getBySalesId: async (salesId: string): Promise<Order[]> => {
    try {
      const orders = await firebaseGetOrders()
      return Array.isArray(orders)
        ? orders
            .filter((o: any) => o.salesId === salesId || o.sales_id === salesId)
            .map(mapOrder)
            .filter(Boolean)
        : []
    } catch (error) {
      console.error("[v0] Error getting orders by sales:", error)
      return []
    }
  },

  getByCmoId: async (cmoId: string, cmoUsername?: string, cmoName?: string): Promise<Order[]> => {
    try {
      const orders = await firebaseGetOrdersByCmoId(cmoId, cmoUsername, cmoName)
      return Array.isArray(orders) ? orders.map(mapOrder).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting orders by CMO:", error)
      return []
    }
  },

  add: async (orderData: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> => {
    try {
      const order = await firebaseCreateOrder(orderData as any)
      return mapOrder(order)
    } catch (error) {
      console.error("[v0] Error creating order:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Order>): Promise<void> => {
    try {
      if (!id) return
      await firebaseUpdateOrder(id, updates)
    } catch (error) {
      console.error("[v0] Error updating order:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await firebaseDeleteOrder(id)
    } catch (error) {
      console.error("[v0] Error deleting order:", error)
      throw error
    }
  },

  addNote: async (orderId: string, note: OrderNote): Promise<void> => {
    try {
      await firebaseCreateOrderNote({
        orderId,
        userId: note.userId,
        userName: note.userName,
        role: note.role, // Pass role to createOrderNote
        note: note.note,
        status: note.status,
      })
    } catch (error) {
      console.error("[v0] Error adding note:", error)
      throw error
    }
  },

  getNotes: async (orderId: string): Promise<OrderNote[]> => {
    try {
      const notes = await firebaseGetOrderNotesByOrderId(orderId)
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("[v0] Error getting notes:", error)
      return []
    }
  },
}

// Simulasi Store - Uses Firebase
export const simulasiStore = {
  getAll: async (): Promise<SimulasiKredit[]> => {
    try {
      const simulasi = await firebaseGetSimulasi()
      return Array.isArray(simulasi) ? simulasi : []
    } catch (error) {
      console.error("[v0] Error getting simulasi:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<SimulasiKredit[]> => {
    try {
      if (!userId) return []
      const simulasi = await firebaseGetSimulasiByUserId(userId)
      return Array.isArray(simulasi) ? simulasi : []
    } catch (error) {
      console.error("[v0] Error getting simulasi by user:", error)
      return []
    }
  },

  add: async (data: Omit<SimulasiKredit, "id" | "createdAt">): Promise<SimulasiKredit> => {
    try {
      await firebaseCreateSimulasi(data as any)
      return data as SimulasiKredit
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
      const aktivitas = await firebaseGetAktivitas()
      return Array.isArray(aktivitas) ? aktivitas : []
    } catch (error) {
      console.error("[v0] Error getting aktivitas:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<Aktivitas[]> => {
    try {
      if (!userId) return []
      const aktivitas = await firebaseGetAktivitasByUserId(userId)
      return Array.isArray(aktivitas) ? aktivitas : []
    } catch (error) {
      console.error("[v0] Error getting aktivitas by user:", error)
      return []
    }
  },

  add: async (data: Omit<Aktivitas, "id" | "createdAt">): Promise<Aktivitas> => {
    try {
      await firebaseCreateAktivitas(data as any)
      return data as Aktivitas
    } catch (error) {
      console.error("[v0] Error creating aktivitas:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await firebaseDeleteAktivitas(id)
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
      const merks = await firebaseGetMerks()
      return Array.isArray(merks)
        ? merks.map((m) => ({
            id: String(m.id),
            nama: m.nama,
            isDefault: m.isDefault,
            isActive: m.isActive,
          }))
        : []
    } catch (error) {
      console.error("[v0] Error getting merks:", error)
      return []
    }
  },

  add: async (data: Omit<Merk, "id" | "createdAt">): Promise<Merk> => {
    try {
      const result = await firebaseCreateMerk(data.nama, data.isDefault)
      return result
        ? { id: String(result.id), nama: result.nama, isDefault: data.isDefault || false, isActive: true }
        : (data as Merk)
    } catch (error) {
      console.error("[v0] Error creating merk:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Merk>): Promise<void> => {
    try {
      if (!id) return
      await firebaseUpdateMerk(id, updates)
    } catch (error) {
      console.error("[v0] Error updating merk:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await firebaseDeleteMerk(id)
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
      const dealers = await firebaseGetDealers()
      return Array.isArray(dealers) ? dealers : []
    } catch (error) {
      console.error("[v0] Error getting dealers:", error)
      return []
    }
  },

  add: async (data: Omit<Dealer, "id" | "createdAt">): Promise<Dealer> => {
    try {
      const dealer = await firebaseCreateDealer(data as any)
      return dealer || (data as Dealer)
    } catch (error) {
      console.error("[v0] Error creating dealer:", error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<Dealer>): Promise<void> => {
    try {
      if (!id) return
      await firebaseUpdateDealer(id, updates)
    } catch (error) {
      console.error("[v0] Error updating dealer:", error)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await firebaseDeleteDealer(id)
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
      const notifications = await firebaseGetNotifications()
      return Array.isArray(notifications) ? notifications.map(mapNotification).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting notifications:", error)
      return []
    }
  },

  getByUserId: async (userId: string): Promise<Notification[]> => {
    try {
      if (!userId) return []
      const notifications = await firebaseGetNotificationsByUserId(userId)
      return Array.isArray(notifications) ? notifications.map(mapNotification).filter(Boolean) : []
    } catch (error) {
      console.error("[v0] Error getting notifications by user:", error)
      return []
    }
  },

  add: async (data: Omit<Notification, "id" | "createdAt">): Promise<Notification> => {
    try {
      await firebaseCreateNotification(data as any)
      return data as Notification
    } catch (error) {
      console.error("[v0] Error creating notification:", error)
      throw error
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      if (!id) return
      await firebaseMarkNotificationAsRead(id)
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
      throw error
    }
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      if (!userId) return
      await firebaseMarkAllNotificationsAsRead(userId)
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
      const notes = await firebaseGetAllOrderNotes()
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("[v0] Error getting all notes:", error)
      return []
    }
  },

  getByOrderId: async (orderId: string): Promise<OrderNote[]> => {
    try {
      if (!orderId) return []
      const notes = await firebaseGetOrderNotesByOrderId(orderId)
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("[v0] Error getting notes by order:", error)
      return []
    }
  },

  add: async (data: Omit<OrderNote, "id" | "createdAt">): Promise<OrderNote> => {
    try {
      await firebaseCreateOrderNote(data as any)
      return data as OrderNote
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
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error("[v0] Error getting session:", e)
    }
    return null
  },

  set: (user: User | null): void => {
    if (typeof window === "undefined") return
    try {
      if (user) {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
      }
    } catch (e) {
      console.error("[v0] Error setting session:", e)
    }
  },

  clear: (): void => {
    if (typeof window === "undefined") return
    try {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
    } catch (e) {
      console.error("[v0] Error clearing session:", e)
    }
  },
}

// Initialize default data (runs on app start)
export const initializeDefaultData = async (): Promise<void> => {
  try {
    await firebaseInitializeDefaultData()
  } catch (error) {
    console.error("[v0] Error initializing default data:", error)
  }
}
