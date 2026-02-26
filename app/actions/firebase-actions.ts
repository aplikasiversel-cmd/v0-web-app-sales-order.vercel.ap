import { firestoreREST, COLLECTIONS } from "@/lib/firebase"
import { DEALER_BY_MERK } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

// ==================== USERS ====================

export async function getUsers() {
  return await firestoreREST.getCollection(COLLECTIONS.USERS)
}

export async function getUserById(id: string) {
  return await firestoreREST.getDocument(COLLECTIONS.USERS, id)
}

export async function getUserByUsername(username: string) {
  const usernameLC = username.toLowerCase()
  const users = await firestoreREST.queryCollection(COLLECTIONS.USERS, "username", "==", usernameLC, 1)

  if (users.length > 0) {
    console.log("[v0] Found user:", {
      username: users[0].username,
      role: users[0].role,
      hasPassword: !!users[0].password,
      passwordPreview: users[0].password ? users[0].password.substring(0, 3) + "***" : "none",
    })
  }

  return users.length > 0 ? users[0] : null
}

export async function getUsersByRole(role: string) {
  return await firestoreREST.queryCollection(COLLECTIONS.USERS, "role", "==", role)
}

export async function createUser(userData: {
  username: string
  password: string
  namaLengkap: string
  role: string
  nomorHp?: string
  merk?: string | string[]
  dealer?: string
  jabatan?: string
  isActive?: boolean
  cmhId?: string
  cmhName?: string
  spvId?: string
  spvName?: string
}) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const user = {
    username: userData.username.toLowerCase(),
    password: userData.password,
    namaLengkap: userData.namaLengkap,
    role: userData.role,
    nomorHp: userData.nomorHp || null,
    merk: userData.merk || null,
    dealer: userData.dealer || null,
    jabatan: userData.jabatan || null,
    isFirstLogin: true,
    passwordLastChanged: null,
    isActive: userData.isActive !== false,
    cmhId: userData.cmhId || null,
    cmhName: userData.cmhName || null,
    spvId: userData.spvId || null,
    spvName: userData.spvName || null,
    createdAt: now,
    updatedAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.USERS, id, user)
  return { id, ...user }
}

export async function updateUser(id: string, updates: Record<string, any>) {
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  }

  if (updates.namaLengkap !== undefined && updates.namaLengkap !== null) updateData.namaLengkap = updates.namaLengkap
  if (updates.nomorHp !== undefined && updates.nomorHp !== null) updateData.nomorHp = updates.nomorHp
  if (updates.merk !== undefined && updates.merk !== null) updateData.merk = updates.merk
  if (updates.dealer !== undefined && updates.dealer !== null) updateData.dealer = updates.dealer
  if (updates.password !== undefined && updates.password !== null) updateData.password = updates.password
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive
  if (updates.isFirstLogin !== undefined) updateData.isFirstLogin = updates.isFirstLogin
  if (updates.passwordLastChanged !== undefined && updates.passwordLastChanged !== null)
    updateData.passwordLastChanged = updates.passwordLastChanged
  if (updates.jabatan !== undefined && updates.jabatan !== null) updateData.jabatan = updates.jabatan
  if (updates.cmhId !== undefined && updates.cmhId !== null) updateData.cmhId = updates.cmhId
  if (updates.cmhName !== undefined && updates.cmhName !== null) updateData.cmhName = updates.cmhName
  if (updates.spvId !== undefined && updates.spvId !== null) updateData.spvId = updates.spvId
  if (updates.spvName !== undefined && updates.spvName !== null) updateData.spvName = updates.spvName

  await firestoreREST.updateDocument(COLLECTIONS.USERS, id, updateData)
  return await getUserById(id)
}

export async function deleteUser(id: string) {
  return await firestoreREST.deleteDocument(COLLECTIONS.USERS, id)
}

// ==================== PROGRAMS ====================

export async function getPrograms() {
  const programs = await firestoreREST.getCollection(COLLECTIONS.PROGRAMS)

  // Get all tenor_bunga
  const allTenorBunga = await firestoreREST.getCollection(COLLECTIONS.TENOR_BUNGA)

  return programs.map((program: any) => {
    const programTenors = allTenorBunga.filter((t: any) => t.programId === program.id)

    // Deduplicate by tenor - keep the latest one if duplicates exist
    const tenorMap = new Map<number, { tenor: number; bunga: number; isActive: boolean }>()
    for (const t of programTenors) {
      tenorMap.set(t.tenor, {
        tenor: t.tenor,
        bunga: t.bunga,
        isActive: t.isActive !== false,
      })
    }

    // Convert to array and sort by tenor ascending
    const sortedTenors = Array.from(tenorMap.values()).sort((a, b) => a.tenor - b.tenor)

    return {
      ...program,
      tenorBunga: sortedTenors,
    }
  })
}

export async function createProgram(programData: {
  namaProgram: string
  jenisPembiayaan?: string
  merk?: string
  tdpPersen?: number
  tenorBunga?: Array<{ tenor: number; bunga: number }>
  isActive?: boolean
}) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const program = {
    namaProgram: programData.namaProgram,
    jenisPembiayaan: programData.jenisPembiayaan || null,
    merk: programData.merk || null,
    tdpPersen: programData.tdpPersen || 0,
    isActive: programData.isActive !== false,
    createdAt: now,
    updatedAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.PROGRAMS, id, program)

  // Create tenor_bunga entries
  if (programData.tenorBunga && programData.tenorBunga.length > 0) {
    for (const tb of programData.tenorBunga) {
      const tenorId = uuidv4()
      await firestoreREST.setDocument(COLLECTIONS.TENOR_BUNGA, tenorId, {
        programId: id,
        tenor: tb.tenor,
        bunga: tb.bunga,
      })
    }
  }

  return { id, ...program, tenorBunga: programData.tenorBunga || [] }
}

export async function updateProgram(id: string, updates: Record<string, any>) {
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  }

  if (updates.namaProgram !== undefined) updateData.namaProgram = updates.namaProgram
  if (updates.jenisPembiayaan !== undefined) updateData.jenisPembiayaan = updates.jenisPembiayaan
  if (updates.merk !== undefined) updateData.merk = updates.merk
  if (updates.tdpPersen !== undefined) updateData.tdpPersen = updates.tdpPersen
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive

  await firestoreREST.updateDocument(COLLECTIONS.PROGRAMS, id, updateData)

  if (updates.tenorBunga) {
    // Get ALL tenor_bunga for this program using collection scan (more reliable than query)
    const allTenorBunga = await firestoreREST.getCollection(COLLECTIONS.TENOR_BUNGA)
    const existingTenor = allTenorBunga.filter((t: any) => t.programId === id)

    // Delete all existing tenor_bunga for this program
    for (const t of existingTenor) {
      await firestoreREST.deleteDocument(COLLECTIONS.TENOR_BUNGA, t.id)
    }

    // Create new ones - deduplicated and sorted
    const tenorMap = new Map<number, { tenor: number; bunga: number; isActive: boolean }>()
    for (const tb of updates.tenorBunga) {
      if (tb.isActive !== false) {
        tenorMap.set(tb.tenor, {
          tenor: tb.tenor,
          bunga: tb.bunga,
          isActive: true,
        })
      }
    }

    // Sort and create
    const sortedTenors = Array.from(tenorMap.values()).sort((a, b) => a.tenor - b.tenor)
    for (const tb of sortedTenors) {
      const tenorId = uuidv4()
      await firestoreREST.setDocument(COLLECTIONS.TENOR_BUNGA, tenorId, {
        programId: id,
        tenor: tb.tenor,
        bunga: tb.bunga,
        isActive: true,
      })
    }
  }

  return true
}

export async function deleteProgram(id: string) {
  // Delete associated tenor_bunga
  const existingTenor = await firestoreREST.queryCollection(COLLECTIONS.TENOR_BUNGA, "programId", "==", id)
  for (const t of existingTenor) {
    await firestoreREST.deleteDocument(COLLECTIONS.TENOR_BUNGA, t.id)
  }

  return await firestoreREST.deleteDocument(COLLECTIONS.PROGRAMS, id)
}

// ==================== ORDERS ====================

export async function getOrders() {
  console.log("[v0] getOrders - starting")
  try {
    const orders = await firestoreREST.getCollection(COLLECTIONS.ORDERS)
    console.log("[v0] getOrders - orders count:", orders?.length || 0)

    if (!orders || orders.length === 0) {
      console.log("[v0] getOrders - no orders found")
      return []
    }

    const allNotes = await firestoreREST.getCollection(COLLECTIONS.ORDER_NOTES)
    console.log("[v0] getOrders - notes count:", allNotes?.length || 0)

    // Map notes to orders
    return orders.map((order: any) => {
      const orderNotes = allNotes.filter((n: any) => n.orderId === order.id)
      // Sort notes by createdAt ascending
      orderNotes.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      return {
        ...order,
        notes: orderNotes.map((n: any) => ({
          id: n.id,
          userId: n.userId,
          userName: n.userName,
          role: n.role,
          note: n.note,
          status: n.status,
          createdAt: n.createdAt,
        })),
      }
    })
  } catch (error) {
    console.error("[v0] getOrders - error:", error)
    return []
  }
}

export async function getOrderById(id: string) {
  const order = await firestoreREST.getDocument(COLLECTIONS.ORDERS, id)
  if (!order) return null

  // Get notes
  const notes = await firestoreREST.queryCollection(COLLECTIONS.ORDER_NOTES, "orderId", "==", id)
  return { ...order, notes }
}

export async function getOrdersByCmoId(cmoId: string, cmoUsername?: string, cmoName?: string) {
  try {
    // Get all orders and filter by cmoId
    const allOrders = await getOrders()
    return allOrders.filter(
      (order: any) => order.cmoId === cmoId || order.cmoName === cmoName || order.claimedBy === cmoId,
    )
  } catch (error) {
    console.error("[Firebase] getOrdersByCmoId error:", error)
    return []
  }
}

export async function createOrder(orderData: Record<string, any>) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const order = {
    salesId: orderData.salesId,
    salesName: orderData.salesName,
    namaNasabah: orderData.namaNasabah,
    fotoKtpNasabah: orderData.fotoKtpNasabah || null,
    namaPasangan: orderData.namaPasangan || null,
    fotoKtpPasangan: orderData.fotoKtpPasangan || null,
    fotoKk: orderData.fotoKk || orderData.fotoKK || null,
    noHp: orderData.noHp,
    typeUnit: orderData.typeUnit,
    merk: orderData.merk,
    dealer: orderData.dealer,
    jenisPembiayaan: orderData.jenisPembiayaan,
    namaProgram: orderData.namaProgram,
    otr: orderData.otr,
    tdp: orderData.tdp,
    angsuran: orderData.angsuran,
    tenor: orderData.tenor,
    cmoId: orderData.cmoId || null,
    cmoName: orderData.cmoName || null,
    catatanKhusus: orderData.catatanKhusus || null,
    status: orderData.status || "Baru",
    hasilSlik: orderData.hasilSlik || null,
    tanggalSurvey: orderData.tanggalSurvey || null,
    fotoSurvey: orderData.fotoSurvey || [],
    claimedBy: orderData.claimedBy || null,
    claimedAt: orderData.claimedAt || null,
    createdAt: now,
    updatedAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.ORDERS, id, order)
  return { id, ...order, notes: [] }
}

export async function updateOrder(id: string, updates: Record<string, any>) {
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  }

  const allowedFields = [
    "namaNasabah",
    "fotoKtpNasabah",
    "namaPasangan",
    "fotoKtpPasangan",
    "fotoKk",
    "noHp",
    "typeUnit",
    "merk",
    "dealer",
    "jenisPembiayaan",
    "namaProgram",
    "otr",
    "tdp",
    "angsuran",
    "tenor",
    "cmoId",
    "cmoName",
    "catatanKhusus",
    "status",
    "hasilSlik",
    "slikNote",
    "tanggalSurvey",
    "fotoSurvey",
    "claimedBy",
    "claimedAt",
    "checklist",
    "checklistKtpPemohon",
    "checklistKtpPasangan",
    "checklistKartuKeluarga",
    "checklistNPWP",
    "checklistBKR",
    "checklistLivin",
    "checklistRekTabungan",
    "checklistMUFApp",
  ]

  for (const field of allowedFields) {
    if (updates[field] !== undefined && updates[field] !== null) {
      updateData[field] = updates[field]
    }
  }

  if (updates.notes && Array.isArray(updates.notes) && updates.notes.length > 0) {
    const existingNotes = await firestoreREST.queryCollection(COLLECTIONS.ORDER_NOTES, "orderId", "==", id)
    const existingNoteIds = new Set(existingNotes.map((n: any) => n.id))

    for (const note of updates.notes) {
      if (note && note.id && !existingNoteIds.has(note.id)) {
        await firestoreREST.setDocument(COLLECTIONS.ORDER_NOTES, note.id, {
          orderId: id,
          userId: note.userId || "",
          userName: note.userName || "",
          role: note.role || "",
          note: note.note || "",
          status: note.status || "",
          createdAt: note.createdAt || new Date().toISOString(),
        })
      }
    }
  }

  await firestoreREST.updateDocument(COLLECTIONS.ORDERS, id, updateData)
  return true
}

export async function deleteOrder(id: string) {
  // Delete associated notes
  const notes = await firestoreREST.queryCollection(COLLECTIONS.ORDER_NOTES, "orderId", "==", id)
  for (const note of notes) {
    await firestoreREST.deleteDocument(COLLECTIONS.ORDER_NOTES, note.id)
  }

  return await firestoreREST.deleteDocument(COLLECTIONS.ORDERS, id)
}

export async function createOrderNote(noteData: {
  orderId: string
  userId: string
  userName: string
  note: string
  status?: string
  role?: string // Add role parameter
}) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const orderNote = {
    orderId: noteData.orderId,
    userId: noteData.userId,
    userName: noteData.userName,
    role: noteData.role || "", // Save role to notes
    note: noteData.note,
    status: noteData.status || null,
    createdAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.ORDER_NOTES, id, orderNote)
  return { id, ...orderNote }
}

export async function getOrderNotesByOrderId(orderId: string) {
  return await firestoreREST.queryCollection(COLLECTIONS.ORDER_NOTES, "orderId", "==", orderId)
}

export async function getAllOrderNotes(): Promise<any[]> {
  return await firestoreREST.getCollection(COLLECTIONS.ORDER_NOTES)
}

// ==================== SIMULASI ====================

export async function getSimulasi() {
  return await firestoreREST.getCollection(COLLECTIONS.SIMULASI)
}

export async function getSimulasiByUserId(userId: string) {
  return await firestoreREST.queryCollection(COLLECTIONS.SIMULASI, "userId", "==", userId)
}

export async function createSimulasi(simulasiData: Record<string, any>) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const simulasi = {
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
    cmoId: simulasiData.cmoId || null,
    cmoName: simulasiData.cmoName || null,
    hasilSimulasi: simulasiData.hasilSimulasi || [],
    createdAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.SIMULASI, id, simulasi)
  return { id, ...simulasi }
}

// ==================== AKTIVITAS ====================

export async function getAktivitas() {
  return await firestoreREST.getCollection(COLLECTIONS.AKTIVITAS)
}

export async function getAktivitasByUserId(userId: string) {
  return await firestoreREST.queryCollection(COLLECTIONS.AKTIVITAS, "userId", "==", userId)
}

export async function createAktivitas(aktivitasData: Record<string, any>) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const aktivitas = {
    userId: aktivitasData.userId,
    userName: aktivitasData.userName,
    role: aktivitasData.role,
    jenisAktivitas: aktivitasData.jenisAktivitas,
    tanggal: aktivitasData.tanggal,
    picDealer: aktivitasData.picDealer || null,
    dealer: aktivitasData.dealer || null,
    fotoAktivitas: aktivitasData.fotoAktivitas || [],
    createdAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.AKTIVITAS, id, aktivitas)
  return { id, ...aktivitas }
}

export async function deleteAktivitas(id: string) {
  return await firestoreREST.deleteDocument(COLLECTIONS.AKTIVITAS, id)
}

// ==================== MERKS ====================

export const DEFAULT_MERKS = [
  "Honda",
  "Daihatsu",
  "Mitsubishi",
  "Suzuki",
  "Toyota",
  "Chery",
  "Hyundai",
  "Wuling",
  "BYD",
  "Isuzu",
  "Nissan",
  "Mazda",
  "Kia",
  "Hino",
  "Citroen",
  "JAECOO",
]

export async function getMerks() {
  return DEFAULT_MERKS.map((nama) => ({
    id: nama.toLowerCase().replace(/\s+/g, "-"),
    nama: nama,
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }))
}

export async function createMerk(nama: string, isDefault = false) {
  if (isDefault) {
    return {
      id: nama.toLowerCase().replace(/\s+/g, "-"),
      nama,
      isDefault: true,
    }
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  const merk = {
    nama,
    isDefault,
    createdAt: now,
    updatedAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.MERKS, id, merk)
  return { id, ...merk }
}

export async function updateMerk(id: string, updates: Record<string, any>) {
  await firestoreREST.updateDocument(COLLECTIONS.MERKS, id, updates)
  return true
}

export async function deleteMerk(id: string) {
  return await firestoreREST.deleteDocument(COLLECTIONS.MERKS, id)
}

// ==================== DEALERS ====================

export async function getDealers() {
  try {
    // First try to get from database
    const dbDealers = await firestoreREST.getCollection(COLLECTIONS.DEALERS)
    if (dbDealers && Array.isArray(dbDealers) && dbDealers.length > 0) {
      return dbDealers
    }
  } catch (error) {
    console.error("[v0] Error getting dealers from database:", error)
  }

  // If no dealers in DB or error, generate from DEALER_BY_MERK constant
  const dealers: any[] = []
  Object.entries(DEALER_BY_MERK).forEach(([merk, dealerNames]) => {
    dealerNames.forEach((namaDealer, index) => {
      dealers.push({
        id: `${merk.toLowerCase()}-dealer-${index}`,
        namaDealer,
        merk,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
    })
  })
  console.log("[v0] getDealers - generated dealers from constant:", dealers.length)
  return dealers
}

export async function createDealer(dealerData: {
  kodeDealer: string
  merk: string
  namaDealer: string
  alamat?: string
  noTelp?: string
  isActive?: boolean
}) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const dealer = {
    kodeDealer: dealerData.kodeDealer,
    merk: dealerData.merk,
    namaDealer: dealerData.namaDealer,
    alamat: dealerData.alamat || null,
    noTelp: dealerData.noTelp || null,
    isActive: dealerData.isActive !== false,
    createdAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.DEALERS, id, dealer)
  return { id, ...dealer }
}

export async function updateDealer(id: string, updates: Record<string, any>) {
  await firestoreREST.updateDocument(COLLECTIONS.DEALERS, id, updates)
  return true
}

export async function deleteDealer(id: string) {
  return await firestoreREST.deleteDocument(COLLECTIONS.DEALERS, id)
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(userId?: string) {
  if (userId) {
    return await firestoreREST.queryCollection(COLLECTIONS.NOTIFICATIONS, "userId", "==", userId)
  }
  return await firestoreREST.getCollection(COLLECTIONS.NOTIFICATIONS)
}

export async function getNotificationsByUserId(userId: string) {
  try {
    if (!userId) return []
    const notifications = await firestoreREST.queryCollection(COLLECTIONS.NOTIFICATIONS, "userId", "==", userId)
    return notifications.map((n: any) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead ?? false,
      referenceId: n.relatedOrderId || n.referenceId,
      createdAt: n.createdAt,
      createdById: n.createdById,
      createdByName: n.createdByName,
    }))
  } catch (error) {
    console.error("[Firebase] getNotificationsByUserId error:", error)
    return []
  }
}

export async function createNotification(notificationData: {
  userId: string
  title: string
  message: string
  type: string
  relatedOrderId?: string
}) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const notification = {
    userId: notificationData.userId,
    title: notificationData.title,
    message: notificationData.message,
    type: notificationData.type,
    relatedOrderId: notificationData.relatedOrderId || null,
    isRead: false,
    createdAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.NOTIFICATIONS, id, notification)
  return { id, ...notification }
}

export async function markNotificationAsRead(id: string) {
  await firestoreREST.updateDocument(COLLECTIONS.NOTIFICATIONS, id, { isRead: true })
  return true
}

export async function markAllNotificationsAsRead(userId: string) {
  const notifications = await firestoreREST.queryCollection(COLLECTIONS.NOTIFICATIONS, "userId", "==", userId)
  for (const n of notifications) {
    if (!n.isRead) {
      await firestoreREST.updateDocument(COLLECTIONS.NOTIFICATIONS, n.id, { isRead: true })
    }
  }
  return true
}

// ==================== INITIALIZATION ====================

let isAlreadyInitialized = false
let initializationPromise: Promise<any> | null = null
let lastInitTime = 0
const INIT_COOLDOWN = 300000 // 5 minutes

// ==================== DEALERS ====================

export async function getDealers() {
  return await firestoreREST.getCollection(COLLECTIONS.DEALERS)
}

export async function createDealer(dealerData: {
  namaDealer: string
  merk: string
  nomorTelepon?: string
  isActive?: boolean
  alamat?: string
}) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const dealer = {
    namaDealer: dealerData.namaDealer,
    merk: dealerData.merk,
    nomorTelepon: dealerData.nomorTelepon || "",
    alamat: dealerData.alamat || "",
    isActive: dealerData.isActive !== false,
    createdAt: now,
    updatedAt: now,
  }

  await firestoreREST.setDocument(COLLECTIONS.DEALERS, id, dealer)
  return { id, ...dealer }
}

export async function updateDealer(id: string, updates: Partial<any>) {
  if (!id) return
  updates.updatedAt = new Date().toISOString()
  await firestoreREST.updateDocument(COLLECTIONS.DEALERS, id, updates)
  return true
}

// ==================== MIGRATION HELPERS ====================

export async function ensureDealerMerkField() {
  try {
    const dealers = await getDealers()
    if (!Array.isArray(dealers) || dealers.length === 0) return

    for (const dealer of dealers) {
      // If dealer is missing merk field, try to infer it from dealer name
      if (!dealer.merk || dealer.merk === "") {
        let inferredMerk = ""
        const dealerNameUpper = (dealer.namaDealer || "").toUpperCase()

        // Infer merk based on dealer name patterns
        if (dealerNameUpper.includes("ASTRA") || dealerNameUpper.includes("DAIHATSU")) {
          inferredMerk = "Daihatsu"
        } else if (dealerNameUpper.includes("TRI MANDIRI") || dealerNameUpper.includes("TMS")) {
          inferredMerk = "Daihatsu"
        } else if (dealerNameUpper.includes("JAECOO") || dealerNameUpper.includes("CHERY")) {
          inferredMerk = "JAECOO"
        }

        // Update dealer with inferred merk
        if (inferredMerk) {
          await updateDealer(dealer.id, { merk: inferredMerk })
          console.log(`[v0] Updated dealer ${dealer.namaDealer} with merk: ${inferredMerk}`)
        }
      }
    }
  } catch (error) {
    console.error("[v0] Error ensuring dealer merk fields:", error)
  }
}

export async function migrateExistingProgramsToDealers() {
  try {
    const programs = await getPrograms()
    if (!Array.isArray(programs) || programs.length === 0) return

    for (const program of programs) {
      // Skip if already has dealers assigned
      if (program.dealers && program.dealers.length > 0) continue

      const programNameUpper = (program.namaProgram || "").toUpperCase()
      let assignedDealers: string[] = []

      // Auto-assign dealers based on program name pattern
      if (programNameUpper.includes("ASTRA")) {
        assignedDealers = DEALER_BY_MERK["Daihatsu"]?.filter((d: string) => d.includes("ASTRA")) || []
      } else if (programNameUpper.includes("TMS") || programNameUpper.includes("TRI MANDIRI")) {
        assignedDealers = DEALER_BY_MERK["Daihatsu"]?.filter((d: string) => d.includes("TRI MANDIRI")) || []
      } else if (program.merk) {
        // If no pattern match, assign all dealers for the merk
        assignedDealers = DEALER_BY_MERK[program.merk] || []
      }

      // Update program with assigned dealers
      if (assignedDealers.length > 0) {
        await firestoreREST.updateDocument(COLLECTIONS.PROGRAMS, program.id, { dealers: assignedDealers })
      }
    }
  } catch (error) {
    console.error("[v0] Error migrating programs to dealers:", error)
  }
}

export async function initializeDefaultData() {
  const now = Date.now()

  if (isAlreadyInitialized || now - lastInitTime < INIT_COOLDOWN) {
    return { success: true, cached: true }
  }

  if (typeof window !== "undefined") {
    if (localStorage.getItem("db_init_done") === "true") {
      isAlreadyInitialized = true
      return { success: true, cached: true }
    }
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      lastInitTime = Date.now()

      const adminUser = await getUserByUsername("admin")

      if (adminUser) {
        isAlreadyInitialized = true
        if (typeof window !== "undefined") {
          localStorage.setItem("db_init_done", "true")
        }
        return { success: true, cached: true }
      }

      await createUser({
        username: "admin",
        password: "Admin@123",
        namaLengkap: "Administrator",
        role: "admin",
        isActive: true,
      })

      return { success: true }
    } catch (error) {
      console.error("Error initializing default data:", error)
      return { success: false, error }
    } finally {
      setTimeout(() => {
        initializationPromise = null
      }, 60000) // Keep promise cached for 60 seconds
    }
  })()

  return initializationPromise
}
