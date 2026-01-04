import type { User, Program, Order, SimulasiKredit, Aktivitas, OrderNote } from "./types"
import {
  getUsers,
  getUserById,
  getUserByUsername,
  getUsersByRole,
  createUser as dbCreateUser,
  updateUser as dbUpdateUser,
  deleteUser as dbDeleteUser,
  getPrograms,
  createProgram as dbCreateProgram,
  updateProgram as dbUpdateProgram,
  deleteProgram as dbDeleteProgram,
  getOrders,
  getOrderById,
  createOrder as dbCreateOrder,
  updateOrder as dbUpdateOrder,
  deleteOrder as dbDeleteOrder,
  createOrderNote as dbCreateOrderNote,
  getOrderNotesByOrderId as dbGetOrderNotesByOrderId,
  createSimulasi as dbCreateSimulasi,
  getSimulasiByUserId,
  getSimulasi,
  createAktivitas as dbCreateAktivitas,
  getAktivitasByUserId,
  getAktivitas,
  deleteAktivitas as dbDeleteAktivitas,
  getMerks,
  createMerk as dbCreateMerk,
  updateMerk as dbUpdateMerk,
  deleteMerk as dbDeleteMerk,
  getDealers,
  createDealer as dbCreateDealer,
  updateDealer as dbUpdateDealer,
  deleteDealer as dbDeleteDealer,
  getNotifications,
  createNotification as dbCreateNotification,
  markNotificationAsRead as dbMarkNotificationAsRead,
  markAllNotificationsAsRead as dbMarkAllNotificationsAsRead,
  initializeDefaultData,
} from "@/app/actions/firebase-actions"

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

// ==================== NEON DATABASE STORES ====================

// Helper to map DB user to app User type
function mapDbUserToUser(dbUser: any): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    password: dbUser.password,
    namaLengkap: dbUser.namaLengkap || dbUser.nama_lengkap,
    role: dbUser.role,
    noHp: dbUser.noHp || dbUser.nomorHp || dbUser.no_hp || "",
    merk: dbUser.merk,
    dealer: dbUser.dealer,
    jabatan: dbUser.jabatan,
    isFirstLogin: dbUser.isFirstLogin ?? dbUser.is_first_login,
    passwordLastChanged: dbUser.passwordLastChanged || dbUser.password_last_changed,
    isActive: dbUser.isActive ?? dbUser.is_active ?? true,
    createdAt: dbUser.createdAt || dbUser.created_at,
    spvId: dbUser.spvId || dbUser.spv_id || "",
    spvName: dbUser.spvName || dbUser.spv_name || "",
    cmhId: dbUser.cmhId || dbUser.cmh_id || "",
    cmhName: dbUser.cmhName || dbUser.cmh_name || "",
  }
}

// User Store - Uses Neon
export const userStore = {
  getAll: async (): Promise<User[]> => {
    try {
      const users = await getUsers()
      return Array.isArray(users) ? users.map(mapDbUserToUser) : []
    } catch (error) {
      console.error("Error getting users:", error)
      return []
    }
  },
  getById: async (id: string): Promise<User | null> => {
    try {
      const user = await getUserById(id)
      return user ? mapDbUserToUser(user) : null
    } catch (error) {
      console.error("Error getting user by id:", error)
      return null
    }
  },
  getByUsername: async (username: string): Promise<User | null> => {
    try {
      const user = await getUserByUsername(username)
      return user ? mapDbUserToUser(user) : null
    } catch (error) {
      console.error("Error getting user by username:", error)
      return null
    }
  },
  getByRole: async (role: User["role"]): Promise<User[]> => {
    try {
      const users = await getUsersByRole(role)
      return Array.isArray(users) ? users.map(mapDbUserToUser) : []
    } catch (error) {
      console.error("Error getting users by role:", error)
      return []
    }
  },
  add: async (userData: Omit<User, "id" | "createdAt">): Promise<User> => {
    const result = await dbCreateUser({
      username: userData.username,
      password: userData.password,
      namaLengkap: userData.namaLengkap,
      role: userData.role,
      noHp: userData.noHp || (userData as any).nomorHp,
      merk: userData.merk,
      dealer: userData.dealer,
      jabatan: userData.jabatan,
      isActive: userData.isActive,
    })
    return mapDbUserToUser(result)
  },
  update: async (id: string, updates: Partial<User>): Promise<void> => {
    await dbUpdateUser(id, updates)
  },
  delete: async (id: string): Promise<void> => {
    await dbDeleteUser(id)
  },
}

// Helper to map DB program to app Program type
function mapDbProgramToProgram(dbProgram: any): Program {
  return {
    id: dbProgram.id,
    namaProgram: dbProgram.namaProgram || dbProgram.nama_program,
    jenisPembiayaan: dbProgram.jenisPembiayaan || dbProgram.jenis_pembiayaan,
    merk: dbProgram.merk,
    tdpPersen: dbProgram.tdpPersen || dbProgram.tdp_persen,
    tenorBunga: dbProgram.tenorBunga || dbProgram.tenor_bunga || [],
    isActive: dbProgram.isActive ?? dbProgram.is_active ?? true,
    createdAt: dbProgram.createdAt || dbProgram.created_at,
    updatedAt: dbProgram.updatedAt || dbProgram.updated_at,
  }
}

// Program Store - Uses Neon
export const programStore = {
  getAll: async (): Promise<Program[]> => {
    try {
      const programs = await getPrograms()
      return Array.isArray(programs) ? programs.map(mapDbProgramToProgram) : []
    } catch (error) {
      console.error("Error getting programs:", error)
      return []
    }
  },
  getById: async (id: string): Promise<Program | null> => {
    try {
      const programs = await getPrograms()
      const program = programs.find((p: any) => p.id === id)
      return program ? mapDbProgramToProgram(program) : null
    } catch (error) {
      console.error("Error getting program by id:", error)
      return null
    }
  },
  add: async (programData: Omit<Program, "id">): Promise<Program> => {
    const result = await dbCreateProgram({
      namaProgram: programData.namaProgram,
      jenisPembiayaan: programData.jenisPembiayaan,
      merk: programData.merk,
      tdpPersen: programData.tdpPersen,
      tenorBunga: programData.tenorBunga,
      isActive: programData.isActive,
    })
    return mapDbProgramToProgram(result)
  },
  update: async (id: string, updates: Partial<Program>): Promise<void> => {
    await dbUpdateProgram(id, updates)
  },
  delete: async (id: string): Promise<void> => {
    await dbDeleteProgram(id)
  },
}

// Helper to map DB order to app Order type
function mapDbOrderToOrder(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    salesId: dbOrder.salesId || dbOrder.sales_id,
    salesName: dbOrder.salesName || dbOrder.sales_name,
    namaNasabah: dbOrder.namaNasabah || dbOrder.nama_nasabah,
    fotoKtpNasabah: dbOrder.fotoKtpNasabah || dbOrder.foto_ktp_nasabah,
    namaPasangan: dbOrder.namaPasangan || dbOrder.nama_pasangan,
    fotoKtpPasangan: dbOrder.fotoKtpPasangan || dbOrder.foto_ktp_pasangan,
    fotoKk: dbOrder.fotoKk || dbOrder.fotoKK || dbOrder.foto_kk,
    noHp: dbOrder.noHp || dbOrder.no_hp,
    typeUnit: dbOrder.typeUnit || dbOrder.type_unit,
    merk: dbOrder.merk,
    dealer: dbOrder.dealer,
    jenisPembiayaan: dbOrder.jenisPembiayaan || dbOrder.jenis_pembiayaan,
    namaProgram: dbOrder.namaProgram || dbOrder.nama_program,
    otr: dbOrder.otr,
    tdp: dbOrder.tdp,
    angsuran: dbOrder.angsuran,
    tenor: dbOrder.tenor,
    cmoId: dbOrder.cmoId || dbOrder.cmo_id,
    cmoName: dbOrder.cmoName || dbOrder.cmo_name,
    catatanKhusus: dbOrder.catatanKhusus || dbOrder.catatan_khusus,
    status: dbOrder.status || "Baru",
    hasilSlik: dbOrder.hasilSlik || dbOrder.hasil_slik,
    tanggalSurvey: dbOrder.tanggalSurvey || dbOrder.tanggal_survey,
    checklist: dbOrder.checklist || {
      ktpPemohon: dbOrder.checklistKtpPemohon ?? dbOrder.checklist_ktp_pemohon ?? false,
      ktpPasangan: dbOrder.checklistKtpPasangan ?? dbOrder.checklist_ktp_pasangan ?? false,
      kartuKeluarga: dbOrder.checklistKartuKeluarga ?? dbOrder.checklist_kartu_keluarga ?? false,
      npwp: dbOrder.checklistNPWP ?? dbOrder.checklist_npwp ?? false,
      bkr: dbOrder.checklistBKR ?? dbOrder.checklist_bkr ?? false,
      livin: dbOrder.checklistLivin ?? dbOrder.checklist_livin ?? false,
      rekTabungan: dbOrder.checklistRekTabungan ?? dbOrder.checklist_rek_tabungan ?? false,
      mufApp: dbOrder.checklistMUFApp ?? dbOrder.checklist_muf_app ?? false,
    },
    fotoSurvey: dbOrder.fotoSurvey || dbOrder.foto_survey || [],
    claimedBy: dbOrder.claimedBy || dbOrder.claimed_by,
    claimedAt: dbOrder.claimedAt || dbOrder.claimed_at,
    notes: dbOrder.notes || [],
    createdAt: dbOrder.createdAt || dbOrder.created_at,
    updatedAt: dbOrder.updatedAt || dbOrder.updated_at,
  }
}

// Order Store - Uses Neon
export const orderStore = {
  getAll: async (): Promise<Order[]> => {
    try {
      const orders = await getOrders()
      return Array.isArray(orders) ? orders.map(mapDbOrderToOrder) : []
    } catch (error) {
      console.error("Error getting orders:", error)
      return []
    }
  },
  getById: async (id: string): Promise<Order | null> => {
    try {
      const order = await getOrderById(id)
      return order ? mapDbOrderToOrder(order) : null
    } catch (error) {
      console.error("Error getting order by id:", error)
      return null
    }
  },
  getBySalesId: async (salesId: string): Promise<Order[]> => {
    try {
      const orders = await getOrders()
      const filtered = orders.filter((o: any) => (o.salesId || o.sales_id) === salesId)
      return filtered.map(mapDbOrderToOrder)
    } catch (error) {
      console.error("Error getting orders by sales id:", error)
      return []
    }
  },
  getByCmoId: async (cmoId: string): Promise<Order[]> => {
    try {
      const orders = await getOrders()
      const filtered = orders.filter((o: any) => (o.cmoId || o.cmo_id) === cmoId)
      return filtered.map(mapDbOrderToOrder)
    } catch (error) {
      console.error("Error getting orders by cmo id:", error)
      return []
    }
  },
  add: async (orderData: Omit<Order, "id" | "createdAt" | "updatedAt" | "notes">): Promise<Order> => {
    try {
      const createdOrder = await dbCreateOrder(orderData)
      return mapDbOrderToOrder(createdOrder)
    } catch (error) {
      console.error("orderStore.add error:", error)
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
    await dbCreateOrderNote({
      orderId,
      userId: note.userId,
      userName: note.userName,
      role: note.role,
      note: note.note,
      status: note.status,
    })
  },
}

// Helper to map DB simulasi to app SimulasiKredit type
function mapDbSimulasiToSimulasi(dbSimulasi: any): SimulasiKredit {
  return {
    id: dbSimulasi.id,
    userId: dbSimulasi.userId || dbSimulasi.user_id,
    userName: dbSimulasi.userName || dbSimulasi.user_name,
    merk: dbSimulasi.merk,
    dealer: dbSimulasi.dealer,
    jenisPembiayaan: dbSimulasi.jenisPembiayaan || dbSimulasi.jenis_pembiayaan,
    namaProgram: dbSimulasi.namaProgram || dbSimulasi.nama_program,
    otr: dbSimulasi.otr,
    mode: dbSimulasi.mode,
    tdp: dbSimulasi.tdp,
    angsuran: dbSimulasi.angsuran,
    cmoId: dbSimulasi.cmoId || dbSimulasi.cmo_id,
    cmoName: dbSimulasi.cmoName || dbSimulasi.cmo_name,
    hasilSimulasi: dbSimulasi.hasilSimulasi || dbSimulasi.hasil_simulasi || [],
    createdAt: dbSimulasi.createdAt || dbSimulasi.created_at,
  }
}

// Simulasi Store - Uses Neon
export const simulasiStore = {
  getAll: async (): Promise<SimulasiKredit[]> => {
    try {
      const simulasi = await getSimulasi()
      return Array.isArray(simulasi) ? simulasi.map(mapDbSimulasiToSimulasi) : []
    } catch (error) {
      console.error("Error getting simulasi:", error)
      return []
    }
  },
  add: async (simulasiData: Omit<SimulasiKredit, "id" | "createdAt">): Promise<SimulasiKredit> => {
    const result = await dbCreateSimulasi({
      userId: simulasiData.userId,
      userName: simulasiData.userName,
      merk: simulasiData.merk,
      dealer: simulasiData.dealer,
      jenisPembiayaan: simulasiData.jenisPembiayaan,
      namaProgram: simulasiData.namaProgram,
      otr: simulasiData.otr,
      mode: simulasiData.mode,
      tdp: simulasiData.tdp,
      angsuran: simulasiData.angsuran,
      cmoId: simulasiData.cmoId,
      cmoName: simulasiData.cmoName,
      hasilSimulasi: simulasiData.hasilSimulasi || (simulasiData as any).results || [],
    })
    return mapDbSimulasiToSimulasi(result)
  },
  getByUserId: async (userId: string): Promise<SimulasiKredit[]> => {
    try {
      const simulasi = await getSimulasiByUserId(userId)
      return Array.isArray(simulasi) ? simulasi.map(mapDbSimulasiToSimulasi) : []
    } catch (error) {
      console.error("Error getting simulasi by user id:", error)
      return []
    }
  },
}

// Helper to map DB aktivitas to app Aktivitas type
function mapDbAktivitasToAktivitas(dbAktivitas: any): Aktivitas {
  return {
    id: dbAktivitas.id,
    userId: dbAktivitas.userId || dbAktivitas.user_id,
    userName: dbAktivitas.userName || dbAktivitas.user_name,
    role: dbAktivitas.role,
    jenisAktivitas: dbAktivitas.jenisAktivitas || dbAktivitas.jenis_aktivitas,
    tanggal: dbAktivitas.tanggal,
    picDealer: dbAktivitas.picDealer || dbAktivitas.pic_dealer,
    dealer: dbAktivitas.dealer,
    fotoAktivitas: dbAktivitas.fotoAktivitas || dbAktivitas.foto_aktivitas || [],
    createdAt: dbAktivitas.createdAt || dbAktivitas.created_at,
  }
}

// Aktivitas Store - Uses Neon
export const aktivitasStore = {
  getAll: async (): Promise<Aktivitas[]> => {
    try {
      const aktivitas = await getAktivitas()
      return Array.isArray(aktivitas) ? aktivitas.map(mapDbAktivitasToAktivitas) : []
    } catch (error) {
      console.error("Error getting aktivitas:", error)
      return []
    }
  },
  add: async (aktivitasData: Omit<Aktivitas, "id" | "createdAt">): Promise<Aktivitas> => {
    const result = await dbCreateAktivitas({
      userId: aktivitasData.userId,
      userName: aktivitasData.userName,
      role: aktivitasData.role,
      jenisAktivitas: aktivitasData.jenisAktivitas,
      tanggal: aktivitasData.tanggal,
      picDealer: aktivitasData.picDealer,
      dealer: aktivitasData.dealer,
      fotoAktivitas: aktivitasData.fotoAktivitas,
    })
    return mapDbAktivitasToAktivitas(result)
  },
  getByUserId: async (userId: string): Promise<Aktivitas[]> => {
    try {
      const aktivitas = await getAktivitasByUserId(userId)
      return Array.isArray(aktivitas) ? aktivitas.map(mapDbAktivitasToAktivitas) : []
    } catch (error) {
      console.error("Error getting aktivitas by user id:", error)
      return []
    }
  },
  delete: async (id: string): Promise<void> => {
    await dbDeleteAktivitas(id)
  },
}

// Merk Store - Uses Neon
export const merkStore = {
  getAll: async () => {
    try {
      const merks = await getMerks()
      return Array.isArray(merks) ? merks : []
    } catch (error) {
      console.error("Error getting merks:", error)
      return []
    }
  },
  add: async (nama: string, isDefault = false) => {
    return await dbCreateMerk(nama, isDefault)
  },
  update: async (id: string, updates: Record<string, any>) => {
    await dbUpdateMerk(id, updates)
  },
  delete: async (id: string) => {
    await dbDeleteMerk(id)
  },
}

// Dealer Store - Uses Neon
export const dealerStore = {
  getAll: async () => {
    try {
      const dealers = await getDealers()
      return Array.isArray(dealers) ? dealers : []
    } catch (error) {
      console.error("Error getting dealers:", error)
      return []
    }
  },
  add: async (dealerData: {
    kodeDealer: string
    merk: string
    namaDealer: string
    alamat?: string
    noTelp?: string
    isActive?: boolean
  }) => {
    return await dbCreateDealer(dealerData)
  },
  update: async (id: string, updates: Record<string, any>) => {
    await dbUpdateDealer(id, updates)
  },
  delete: async (id: string) => {
    await dbDeleteDealer(id)
  },
}

// Notification Store - Uses Firebase
export const notificationStore = {
  getByUserId: async (userId: string) => {
    try {
      const notifications = await getNotifications(userId)
      return Array.isArray(notifications) ? notifications : []
    } catch (error) {
      console.error("Error getting notifications:", error)
      return []
    }
  },
  add: async (notificationData: {
    userId: string
    title: string
    message: string
    type: string
    relatedOrderId?: string
  }) => {
    return await dbCreateNotification(notificationData)
  },
  markAsRead: async (id: string) => {
    await dbMarkNotificationAsRead(id)
  },
  markAllAsRead: async (userId: string) => {
    await dbMarkAllNotificationsAsRead(userId)
  },
}

// Note Store - Uses Neon
export const noteStore = {
  getByOrderId: async (orderId: string): Promise<OrderNote[]> => {
    try {
      const notes = await dbGetOrderNotesByOrderId(orderId)
      return Array.isArray(notes)
        ? notes.map((n: any) => ({
            id: n.id,
            orderId: n.orderId,
            userId: n.userId,
            userName: n.userName,
            role: n.role,
            note: n.note,
            status: n.status,
            createdAt: n.createdAt,
          }))
        : []
    } catch (error) {
      console.error("Error getting notes by order id:", error)
      return []
    }
  },
  add: async (noteData: OrderNote): Promise<OrderNote> => {
    try {
      const result = await dbCreateOrderNote({
        orderId: noteData.orderId || (noteData as any).oderId,
        userId: noteData.userId,
        userName: noteData.userName,
        role: noteData.role,
        note: noteData.note,
        status: noteData.status,
      })
      return {
        id: result.id,
        orderId: result.orderId,
        userId: result.userId,
        userName: result.userName,
        role: result.role,
        note: result.note,
        status: result.status,
        createdAt: result.createdAt,
      }
    } catch (error) {
      console.error("Error adding note:", error)
      throw error
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

// Initialization Store - Uses Neon
export const initializationStore = {
  initialize: async (): Promise<void> => {
    try {
      await initializeDefaultData()
    } catch (error) {
      console.error("Error initializing default data:", error)
    }
  },
}
