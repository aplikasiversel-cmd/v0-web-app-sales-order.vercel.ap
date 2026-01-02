import { firestoreREST, COLLECTIONS } from "@/lib/firebase"
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
  const users = await firestoreREST.queryCollection(COLLECTIONS.USERS, "username", "==", usernameLC)
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

  if (updates.namaLengkap !== undefined) updateData.namaLengkap = updates.namaLengkap
  if (updates.nomorHp !== undefined) updateData.nomorHp = updates.nomorHp
  if (updates.merk !== undefined) updateData.merk = updates.merk
  if (updates.dealer !== undefined) updateData.dealer = updates.dealer
  if (updates.password !== undefined) updateData.password = updates.password
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive
  if (updates.isFirstLogin !== undefined) updateData.isFirstLogin = updates.isFirstLogin
  if (updates.passwordLastChanged !== undefined) updateData.passwordLastChanged = updates.passwordLastChanged
  if (updates.jabatan !== undefined) updateData.jabatan = updates.jabatan
  if (updates.cmhId !== undefined) updateData.cmhId = updates.cmhId
  if (updates.cmhName !== undefined) updateData.cmhName = updates.cmhName
  if (updates.spvId !== undefined) updateData.spvId = updates.spvId
  if (updates.spvName !== undefined) updateData.spvName = updates.spvName

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
  return await firestoreREST.getCollection(COLLECTIONS.ORDERS)
}

export async function getOrderById(id: string) {
  const order = await firestoreREST.getDocument(COLLECTIONS.ORDERS, id)
  if (!order) return null

  // Get notes
  const notes = await firestoreREST.queryCollection(COLLECTIONS.ORDER_NOTES, "orderId", "==", id)
  return { ...order, notes }
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
    fotoKK: orderData.fotoKK || null,
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
    "fotoKK",
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
    "tanggalSurvey",
    "fotoSurvey",
    "claimedBy",
    "claimedAt",
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
    if (updates[field] !== undefined) {
      updateData[field] = updates[field]
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
  role: string
  note: string
  status?: string
}) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const orderNote = {
    orderId: noteData.orderId,
    userId: noteData.userId,
    userName: noteData.userName,
    role: noteData.role,
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

export async function getMerks() {
  return await firestoreREST.getCollection(COLLECTIONS.MERKS)
}

export async function createMerk(nama: string, isDefault = false) {
  const id = uuidv4()
  const now = new Date().toISOString()

  const merk = {
    nama,
    isDefault,
    createdAt: now,
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
  return await firestoreREST.getCollection(COLLECTIONS.DEALERS)
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

export async function initializeDefaultData() {
  try {
    // Check if admin exists
    const adminUser = await getUserByUsername("admin")

    if (!adminUser) {
      // Create default admin
      await createUser({
        username: "admin",
        password: "Admin@123",
        namaLengkap: "Administrator",
        role: "admin",
        isActive: true,
      })
      console.log("Default admin created")
    }

    const cmo1 = await getUserByUsername("25029956")
    if (!cmo1) {
      await createUser({
        username: "25029956",
        password: "cmo1234",
        namaLengkap: "FAISAL FAJAR",
        role: "cmo",
        jabatan: "CMO",
        isActive: true,
      })
      console.log("Default CMO 1 created")
    }

    const cmo2 = await getUserByUsername("24028259")
    if (!cmo2) {
      await createUser({
        username: "24028259",
        password: "cmo1234",
        namaLengkap: "ROBBY ANGGARA SASMITA",
        role: "cmo",
        jabatan: "CMO",
        isActive: true,
      })
      console.log("Default CMO 2 created")
    }

    const cmh1 = await getUserByUsername("23025309")
    if (!cmh1) {
      await createUser({
        username: "23025309",
        password: "cmh1234",
        namaLengkap: "M SAHID",
        role: "cmh",
        jabatan: "CMH",
        isActive: true,
      })
      console.log("Default CMH created")
    }

    // Check if merks exist
    const merks = await getMerks()

    if (merks.length === 0) {
      // Create default merks
      const defaultMerks = [
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

      for (const nama of defaultMerks) {
        await createMerk(nama, true)
      }
      console.log("Default merks created")
    }

    return { success: true }
  } catch (error) {
    console.error("Error initializing default data:", error)
    return { success: false, error }
  }
}
