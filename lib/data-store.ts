import type { User, Program, Order, SimulasiKredit, Aktivitas } from "./types"
import {
  getUsers,
  getUserById,
  getUserByUsername,
  getUsersByRole,
  createUser as dbCreateUser,
  updateUser as dbUpdateUser,
  deleteUser as dbDeleteUser,
  getPrograms,
  getProgramById,
  createProgram as dbCreateProgram,
  updateProgram as dbUpdateProgram,
  deleteProgram as dbDeleteProgram,
  getOrders,
  getOrderById,
  getOrdersBySalesId,
  getOrdersByCmoId,
  createOrder as dbCreateOrder,
  updateOrder as dbUpdateOrder,
  deleteOrder as dbDeleteOrder,
  addOrderNote as dbAddOrderNote,
  createSimulasi as dbCreateSimulasi,
  getSimulasiByUserId,
  createAktivitas as dbCreateAktivitas,
  getAktivitasByUserId,
  getAktivitas,
  type AktivitasDB,
} from "@/app/actions/db-actions"
import type { OrderNote } from "./types"

// Helper untuk generate ID
export function generateId(): string {
  return crypto.randomUUID()
}

// Helper untuk generate username
export function generateUsername(namaLengkap: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  const nums = "0123456789"
  let suffix = ""
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  for (let i = 0; i < 3; i++) {
    suffix += nums.charAt(Math.floor(Math.random() * nums.length))
  }
  return `${namaLengkap.toUpperCase().replace(/\s+/g, "_")}_${suffix}`
}

// Local Storage Keys for session only
const STORAGE_KEYS = {
  CURRENT_USER: "muf_current_user",
}

// ==================== DATABASE-BACKED STORES ====================
// All data is now stored in Neon PostgreSQL and synced across all devices

// User Store - Uses Neon database
export const userStore = {
  getAll: async (): Promise<User[]> => {
    try {
      const users = await getUsers()
      return Array.isArray(users) ? users : []
    } catch (error) {
      console.error("Error getting users:", error)
      return []
    }
  },
  getById: async (id: string): Promise<User | null> => {
    try {
      return await getUserById(id)
    } catch (error) {
      console.error("Error getting user by id:", error)
      return null
    }
  },
  getByUsername: async (username: string): Promise<User | null> => {
    try {
      return await getUserByUsername(username)
    } catch (error) {
      console.error("Error getting user by username:", error)
      return null
    }
  },
  getByRole: async (role: User["role"]): Promise<User[]> => {
    try {
      const users = await getUsersByRole(role)
      return Array.isArray(users) ? users : []
    } catch (error) {
      console.error("Error getting users by role:", error)
      return []
    }
  },
  add: async (userData: Omit<User, "id" | "createdAt">): Promise<User> => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      merk: Array.isArray(userData.merk) ? userData.merk : ([userData.merk].filter(Boolean) as string[]),
      nomorHp: userData.nomorHp || (userData as { noHp?: string }).noHp || "",
    }
    await dbCreateUser(newUser)
    return newUser
  },
  update: async (id: string, updates: Partial<User>): Promise<void> => {
    await dbUpdateUser(id, updates)
  },
  delete: async (id: string): Promise<void> => {
    await dbDeleteUser(id)
  },
}

// Program Store - Uses Neon database
export const programStore = {
  getAll: async (): Promise<Program[]> => {
    try {
      const programs = await getPrograms()
      return Array.isArray(programs) ? programs : []
    } catch (error) {
      console.error("Error getting programs:", error)
      return []
    }
  },
  getById: async (id: string): Promise<Program | null> => {
    try {
      return await getProgramById(id)
    } catch (error) {
      console.error("Error getting program by id:", error)
      return null
    }
  },
  add: async (programData: Omit<Program, "id">): Promise<Program> => {
    const newProgram: Program = {
      ...programData,
      id: generateId(),
    }
    await dbCreateProgram(newProgram)
    return newProgram
  },
  update: async (id: string, updates: Partial<Program>): Promise<void> => {
    await dbUpdateProgram(id, updates)
  },
  delete: async (id: string): Promise<void> => {
    await dbDeleteProgram(id)
  },
}

// Order Store - Uses Neon database
export const orderStore = {
  getAll: async (): Promise<Order[]> => {
    try {
      const orders = await getOrders()
      return Array.isArray(orders) ? orders : []
    } catch (error) {
      console.error("Error getting orders:", error)
      return []
    }
  },
  getById: async (id: string): Promise<Order | null> => {
    try {
      return await getOrderById(id)
    } catch (error) {
      console.error("Error getting order by id:", error)
      return null
    }
  },
  getBySalesId: async (salesId: string): Promise<Order[]> => {
    try {
      const orders = await getOrdersBySalesId(salesId)
      return Array.isArray(orders) ? orders : []
    } catch (error) {
      console.error("Error getting orders by sales id:", error)
      return []
    }
  },
  getByCmoId: async (cmoId: string): Promise<Order[]> => {
    try {
      const orders = await getOrdersByCmoId(cmoId)
      return Array.isArray(orders) ? orders : []
    } catch (error) {
      console.error("Error getting orders by cmo id:", error)
      return []
    }
  },
  add: async (orderData: Omit<Order, "id" | "createdAt" | "updatedAt" | "notes">): Promise<Order> => {
    try {
      const createdOrder = await dbCreateOrder(orderData)
      return createdOrder
    } catch (error) {
      console.error("[DB] orderStore.add error:", error)
      throw error
    }
  },
  update: async (id: string, updates: Partial<Order>): Promise<void> => {
    await dbUpdateOrder(id, updates)
  },
  delete: async (id: string): Promise<void> => {
    await dbDeleteOrder(id)
  },
  addNote: async (orderId: string, note: OrderNote): Promise<void> => {
    await dbAddOrderNote(orderId, note)
  },
}

// Simulasi Store - Uses Neon database
export const simulasiStore = {
  add: async (simulasiData: Omit<SimulasiKredit, "id" | "createdAt">): Promise<SimulasiKredit> => {
    const newSimulasi: SimulasiKredit = {
      ...simulasiData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      hasilSimulasi: simulasiData.hasilSimulasi || (simulasiData as any).results || [],
    }
    await dbCreateSimulasi(newSimulasi)
    return newSimulasi
  },
  getByUserId: async (userId: string): Promise<SimulasiKredit[]> => {
    try {
      const simulasi = await getSimulasiByUserId(userId)
      return Array.isArray(simulasi) ? simulasi : []
    } catch (error) {
      console.error("Error getting simulasi by user id:", error)
      return []
    }
  },
}

// Aktivitas Store - Uses Neon database
export const aktivitasStore = {
  getAll: async (): Promise<Aktivitas[]> => {
    try {
      const aktivitas = await getAktivitas()
      // Map from DB format to app format
      return Array.isArray(aktivitas)
        ? aktivitas.map((a: AktivitasDB) => ({
            id: a.id,
            userId: a.userId,
            userName: a.userName,
            role: a.role as Aktivitas["role"],
            jenisAktivitas: a.jenisAktivitas as Aktivitas["jenisAktivitas"],
            tanggal: a.tanggal,
            picDealer: a.picDealer,
            dealer: a.dealer,
            fotoAktivitas: a.fotoAktivitas || [],
            createdAt: a.createdAt,
          }))
        : []
    } catch (error) {
      console.error("Error getting aktivitas:", error)
      return []
    }
  },
  add: async (aktivitasData: Omit<Aktivitas, "id" | "createdAt">): Promise<Aktivitas> => {
    const id = generateId()
    const now = new Date().toISOString()

    // Call db function with correct parameter structure
    await dbCreateAktivitas({
      userId: aktivitasData.userId,
      userName: aktivitasData.userName,
      role: aktivitasData.role,
      jenisAktivitas: aktivitasData.jenisAktivitas,
      tanggal: aktivitasData.tanggal,
      picDealer: aktivitasData.picDealer,
      dealer: aktivitasData.dealer,
      fotoAktivitas: aktivitasData.fotoAktivitas,
    })

    return {
      ...aktivitasData,
      id,
      createdAt: now,
    }
  },
  getByUserId: async (userId: string): Promise<Aktivitas[]> => {
    try {
      const aktivitas = await getAktivitasByUserId(userId)
      // Map from DB format to app format
      return Array.isArray(aktivitas)
        ? aktivitas.map((a: AktivitasDB) => ({
            id: a.id,
            userId: a.userId,
            userName: a.userName,
            role: a.role as Aktivitas["role"],
            jenisAktivitas: a.jenisAktivitas as Aktivitas["jenisAktivitas"],
            tanggal: a.tanggal,
            picDealer: a.picDealer,
            dealer: a.dealer,
            fotoAktivitas: a.fotoAktivitas || [],
            createdAt: a.createdAt,
          }))
        : []
    } catch (error) {
      console.error("Error getting aktivitas by user id:", error)
      return []
    }
  },
}

// Session Store - Local storage only for current session
export const sessionStore = {
  get: (): User | null => {
    if (typeof window === "undefined") return null
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },
  set: (user: User): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
    } catch (error) {
      console.error("Error setting session:", error)
    }
  },
  clear: (): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
    } catch (error) {
      console.error("Error clearing session:", error)
    }
  },
}
