"use server"

import { neon } from "@neondatabase/serverless"
import type {
  User,
  Program,
  Order,
  SimulasiKredit,
  OrderNote,
  UserRole,
  OrderStatus,
  JenisPembiayaan,
  Dealer,
} from "@/lib/types"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)

// Helper to convert Date to ISO string
function toISOString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString()
  if (date instanceof Date) return date.toISOString()
  if (typeof date === "string") return date
  return new Date().toISOString()
}

// Helper to parse merk array from various formats
function parseMerkArray(merk: unknown): string[] {
  if (!merk) return []

  // If already an array, clean each item
  if (Array.isArray(merk)) {
    return merk
      .map((m) =>
        String(m)
          .replace(/[{}"[\]]/g, "")
          .trim(),
      )
      .filter(Boolean)
  }

  // If it's a string
  if (typeof merk === "string") {
    // Handle PostgreSQL array format: {"Honda","Toyota"}
    if (merk.startsWith("{") && merk.endsWith("}")) {
      const inner = merk.slice(1, -1) // Remove { and }
      if (!inner) return []
      // Split by comma, but respect quoted strings
      return inner
        .split(",")
        .map((m) => m.replace(/"/g, "").trim())
        .filter(Boolean)
    }

    // Handle JSON array format: ["Honda","Toyota"]
    if (merk.startsWith("[")) {
      try {
        const parsed = JSON.parse(merk)
        if (Array.isArray(parsed)) {
          return parsed.map((m) => String(m).trim()).filter(Boolean)
        }
      } catch {
        // Not valid JSON, treat as single value
      }
    }

    // Single value
    const cleanMerk = merk.replace(/[{}"[\]]/g, "").trim()
    return cleanMerk ? [cleanMerk] : []
  }

  return []
}

// Helper function to map database row to User type
function mapDbUserToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    password: row.password as string,
    namaLengkap: row.nama_lengkap as string,
    nomorHp: row.no_hp as string,
    role: row.role as User["role"],
    dealer: row.dealer as string,
    merk: parseMerkArray(row.merk), // Use parseMerkArray helper
    jabatan: (row.jabatan as string) || undefined,
    isActive: row.is_active as boolean,
    createdAt: toISOString(row.created_at as Date | string),
    passwordLastChanged: row.password_last_changed
      ? toISOString(row.password_last_changed as Date | string)
      : undefined,
    isFirstLogin: (row.is_first_login as boolean) || false,
  }
}

// Helper function to map database row to Program type
function mapDbProgramToProgram(row: Record<string, unknown>): Program {
  let tenorBunga = undefined
  if (row.tenor_bunga) {
    if (typeof row.tenor_bunga === "string") {
      try {
        tenorBunga = JSON.parse(row.tenor_bunga)
      } catch {
        tenorBunga = []
      }
    } else if (Array.isArray(row.tenor_bunga)) {
      tenorBunga = row.tenor_bunga
    }
  }

  return {
    id: row.id as string,
    merk: row.merk as string,
    namaProgram: row.nama_program as string,
    tenor: row.tenor as number,
    bunga: row.bunga as number,
    adminRate: row.admin_rate as number,
    provisiRate: row.provisi_rate as number,
    asuransiRate: row.asuransi_rate as number,
    tdpMinRate: row.tdp_min_rate as number,
    isActive: row.is_active as boolean,
    tenorBunga: tenorBunga,
    jenisPembiayaan: (row.jenis_pembiayaan as string) || undefined,
    tdpPersen: (row.tdp_persen as number) || 0,
  }
}

// Helper function to map database row to Order type
function mapDbOrderToOrder(row: Record<string, unknown>, notes: OrderNote[]): Order {
  // Parse notes from JSONB
  let parsedNotes: OrderNote[] = []
  if (row.notes) {
    try {
      const notesData = typeof row.notes === "string" ? JSON.parse(row.notes) : row.notes
      if (Array.isArray(notesData)) {
        parsedNotes = notesData.map((n: Record<string, unknown>) => ({
          id: (n.id as string) || crypto.randomUUID(),
          userId: (n.userId as string) || "",
          userName: (n.userName as string) || "Unknown",
          role: (n.role as UserRole) || "sales",
          note: (n.note as string) || (n.content as string) || "", // support both note and content for backwards compatibility
          status: (n.status as OrderStatus) || "Baru",
          createdAt: toISOString((n.createdAt as Date | string) || new Date().toISOString()),
        }))
      }
    } catch (e) {
      console.error("[DB] Error parsing notes:", e)
    }
  }

  return {
    id: row.id as string,
    salesId: row.sales_id as string,
    salesName: (row.sales_name as string) || "", // Fixed: salesNama -> salesName
    merk: row.merk as string,
    dealer: row.dealer as string,
    namaNasabah: row.nama_nasabah as string,
    noHp: (row.no_hp as string) || "", // Fixed: nomorHpNasabah -> noHp
    namaPasangan: (row.nama_pasangan as string) || undefined,
    typeUnit: row.type_unit as string,
    jenisPembiayaan: row.jenis_pembiayaan as JenisPembiayaan,
    otr: Number(row.otr) || 0,
    tdp: Number(row.tdp) || 0,
    tenor: Number(row.tenor) || 0,
    angsuran: Number(row.angsuran) || 0,
    namaProgram: row.nama_program as string,
    cmoId: (row.cmo_id as string) || "",
    cmoName: (row.cmo_name as string) || "", // Fixed: cmoNama -> cmoName
    catatanKhusus: (row.catatan_khusus as string) || undefined,
    status: (row.status as OrderStatus) || "Baru",
    hasilSlik: (row.hasil_slik as string) || undefined,
    createdAt: toISOString(row.created_at as Date | string),
    updatedAt: toISOString(row.updated_at as Date | string),
    claimedAt: row.claimed_at ? toISOString(row.claimed_at as Date | string) : undefined,
    claimedBy: (row.claimed_by as string) || undefined,
    tanggalSurvey: row.tanggal_survey ? toISOString(row.tanggal_survey as Date | string) : undefined,
    fotoKtpNasabah: (row.foto_ktp_nasabah as string) || undefined,
    fotoKtpPasangan: (row.foto_ktp_pasangan as string) || undefined,
    fotoKk: (row.foto_kk as string) || undefined,
    fotoSurvey: Array.isArray(row.foto_survey) ? (row.foto_survey as string[]) : [],
    slikResult: (row.slik_result as Order["slikResult"]) || undefined,
    bandingReason: (row.banding_reason as string) || undefined,
    cmhDecisionReason: (row.cmh_decision_reason as string) || undefined,
    checklist: {
      ktpPemohon: Boolean(row.checklist_ktp_pemohon),
      ktpPasangan: Boolean(row.checklist_ktp_pasangan),
      kartuKeluarga: Boolean(row.checklist_kartu_keluarga),
      npwp: Boolean(row.checklist_npwp),
      bkr: Boolean(row.checklist_bkr),
      livin: Boolean(row.checklist_livin),
      rekTabungan: Boolean(row.checklist_rek_tabungan),
      mufApp: Boolean(row.checklist_muf_app),
    },
    notes: parsedNotes,
  }
}

// ==================== USER OPERATIONS ====================

export async function getUsers(): Promise<User[]> {
  try {
    const rows = await sql`SELECT * FROM users ORDER BY created_at DESC`
    return rows.map(mapDbUserToUser)
  } catch (error) {
    console.error("[DB] getUsers error:", error)
    return []
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    if (!id || typeof id !== "string") {
      return null
    }
    const rows = await sql`SELECT * FROM users WHERE id = ${id}::TEXT`
    return rows.length > 0 ? mapDbUserToUser(rows[0]) : null
  } catch (error) {
    console.error("[DB] getUserById error:", error)
    return null
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    if (!username || typeof username !== "string") {
      return null
    }
    const rows = await sql`SELECT * FROM users WHERE LOWER(username) = LOWER(${username})`
    return rows.length > 0 ? mapDbUserToUser(rows[0]) : null
  } catch (error) {
    console.error("[DB] getUserByUsername error:", error)
    return null
  }
}

export async function getUsersByRole(role: string): Promise<User[]> {
  try {
    if (!role || typeof role !== "string") {
      return []
    }
    const rows = await sql`SELECT * FROM users WHERE role = ${role} AND is_active = true ORDER BY nama_lengkap`
    return rows.map(mapDbUserToUser)
  } catch (error) {
    console.error("[DB] getUsersByRole error:", error)
    return []
  }
}

export async function createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await sql`
    INSERT INTO users (id, username, password, nama_lengkap, no_hp, role, dealer, merk, jabatan, is_active, created_at, password_last_changed, is_first_login)
    VALUES (${id}::TEXT, ${user.username}, ${user.password}, ${user.namaLengkap}, ${user.nomorHp || null}, ${user.role}, ${user.dealer || null}, ${user.merk || null}, ${user.jabatan || null}, ${user.isActive !== false}, ${now}::TIMESTAMP, ${user.passwordLastChanged || null}::TIMESTAMP, ${user.isFirstLogin !== false})
  `

  return {
    id,
    ...user,
    createdAt: now,
    isFirstLogin: user.isFirstLogin !== false,
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  try {
    console.log("[v0] updateUser - id:", id)
    console.log("[v0] updateUser - updates:", updates)

    if (!id || typeof id !== "string") {
      console.error("[v0] updateUser - invalid id")
      throw new Error("Invalid user ID")
    }
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.username !== undefined) {
      fields.push("username")
      values.push(updates.username)
    }
    if (updates.password !== undefined) {
      fields.push("password")
      values.push(updates.password)
    }
    if (updates.namaLengkap !== undefined) {
      fields.push("nama_lengkap")
      values.push(updates.namaLengkap)
    }
    if (updates.nomorHp !== undefined || (updates as any).noHp !== undefined) {
      fields.push("no_hp")
      values.push(updates.nomorHp || (updates as any).noHp)
    }
    if (updates.role !== undefined) {
      fields.push("role")
      values.push(updates.role)
    }
    if (updates.dealer !== undefined) {
      fields.push("dealer")
      values.push(updates.dealer)
    }
    if (updates.merk !== undefined) {
      fields.push("merk")
      values.push(updates.merk)
    }
    if (updates.jabatan !== undefined) {
      fields.push("jabatan")
      values.push(updates.jabatan)
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active")
      values.push(updates.isActive)
    }
    if (updates.passwordLastChanged !== undefined) {
      fields.push("password_last_changed")
      values.push(updates.passwordLastChanged)
    }
    if (updates.isFirstLogin !== undefined) {
      fields.push("is_first_login")
      values.push(updates.isFirstLogin)
    }

    if (fields.length === 0) {
      console.log("[v0] updateUser - no fields to update")
      return
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ")
    const query = `UPDATE users SET ${setClause} WHERE id = $1`

    console.log("[v0] updateUser - query:", query)
    console.log("[v0] updateUser - values:", [id, ...values])

    const result = await sql.query(query, [id, ...values])
    console.log("[v0] updateUser - result:", result)
  } catch (error) {
    console.error("[v0] updateUser error:", error)
    throw error
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    if (!id || typeof id !== "string") {
      return
    }
    await sql`DELETE FROM users WHERE id = ${id}::TEXT`
  } catch (error) {
    console.error("[DB] deleteUser error:", error)
  }
}

// ==================== PROGRAM OPERATIONS ====================

export async function getPrograms(): Promise<Program[]> {
  try {
    const rows = await sql`SELECT * FROM programs ORDER BY merk, nama_program`
    return rows.map(mapDbProgramToProgram)
  } catch (error) {
    console.error("[DB] getPrograms error:", error)
    return []
  }
}

export async function getProgramById(id: string): Promise<Program | null> {
  try {
    if (!id || typeof id !== "string") {
      return null
    }
    const rows = await sql`SELECT * FROM programs WHERE id = ${id}::TEXT`
    return rows.length > 0 ? mapDbProgramToProgram(rows[0]) : null
  } catch (error) {
    console.error("[DB] getProgramById error:", error)
    return null
  }
}

export async function createProgram(program: Omit<Program, "id">): Promise<Program> {
  const id = crypto.randomUUID()

  const tenorBungaJson = program.tenorBunga ? JSON.stringify(program.tenorBunga) : "[]"

  await sql`
    INSERT INTO programs (id, merk, nama_program, jenis_pembiayaan, tdp_persen, tenor_bunga, is_active, created_at, updated_at)
    VALUES (
      ${id}::TEXT, 
      ${program.merk}, 
      ${program.namaProgram}, 
      ${program.jenisPembiayaan || null}, 
      ${program.tdpPersen || 0}, 
      ${tenorBungaJson}::JSONB, 
      ${program.isActive}, 
      CURRENT_TIMESTAMP, 
      CURRENT_TIMESTAMP
    )
  `

  return { id, ...program }
}

export async function updateProgram(id: string, updates: Partial<Program>): Promise<void> {
  try {
    if (!id || typeof id !== "string") {
      return
    }
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.merk !== undefined) {
      fields.push("merk")
      values.push(updates.merk)
    }
    if (updates.namaProgram !== undefined) {
      fields.push("nama_program")
      values.push(updates.namaProgram)
    }
    if (updates.jenisPembiayaan !== undefined) {
      fields.push("jenis_pembiayaan")
      values.push(updates.jenisPembiayaan)
    }
    if (updates.tdpPersen !== undefined) {
      fields.push("tdp_persen")
      values.push(updates.tdpPersen)
    }
    if (updates.tenorBunga !== undefined) {
      fields.push("tenor_bunga")
      values.push(JSON.stringify(updates.tenorBunga))
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active")
      values.push(updates.isActive)
    }

    // Always update updated_at
    fields.push("updated_at")
    values.push(new Date().toISOString())

    if (fields.length === 0) return

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ")
    const query = `UPDATE programs SET ${setClause} WHERE id = $1::TEXT`

    await sql.query(query, [id, ...values])
  } catch (error) {
    console.error("[DB] updateProgram error:", error)
  }
}

export async function deleteProgram(id: string): Promise<void> {
  try {
    if (!id || typeof id !== "string") {
      return
    }
    await sql`DELETE FROM programs WHERE id = ${id}::TEXT`
  } catch (error) {
    console.error("[DB] deleteProgram error:", error)
  }
}

// ==================== ORDER OPERATIONS ====================

export async function getOrders(): Promise<Order[]> {
  try {
    const orderRows = await sql`SELECT * FROM orders ORDER BY created_at DESC`
    const noteRows = await sql`SELECT * FROM order_notes ORDER BY created_at ASC`

    return orderRows.map((o) =>
      mapDbOrderToOrder(
        o,
        noteRows.filter((n) => n.order_id === o.id),
      ),
    )
  } catch (error) {
    console.error("[DB] getOrders error:", error)
    return []
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    if (!id || typeof id !== "string") {
      return null
    }
    const orderRows = await sql`SELECT * FROM orders WHERE id = ${id}::TEXT`
    if (orderRows.length === 0) return null

    const noteRows = await sql`SELECT * FROM order_notes WHERE order_id = ${id}::TEXT ORDER BY created_at ASC`
    return mapDbOrderToOrder(orderRows[0], noteRows)
  } catch (error) {
    console.error("[DB] getOrderById error:", error)
    return null
  }
}

export async function getOrdersBySalesId(salesId: string): Promise<Order[]> {
  try {
    if (!salesId || typeof salesId !== "string") {
      return []
    }
    const orderRows = await sql`SELECT * FROM orders WHERE sales_id = ${salesId}::TEXT ORDER BY created_at DESC`
    const noteRows =
      await sql`SELECT * FROM order_notes WHERE order_id = ANY(SELECT id FROM orders WHERE sales_id = ${salesId}::TEXT) ORDER BY created_at ASC`

    return orderRows.map((o) =>
      mapDbOrderToOrder(
        o,
        noteRows.filter((n) => n.order_id === o.id),
      ),
    )
  } catch (error) {
    console.error("[DB] getOrdersBySalesId error:", error)
    return []
  }
}

export async function getOrdersByCmoId(cmoId: string): Promise<Order[]> {
  try {
    if (!cmoId || typeof cmoId !== "string") {
      return []
    }
    const orderRows = await sql`SELECT * FROM orders WHERE cmo_id = ${cmoId}::TEXT ORDER BY created_at DESC`
    const noteRows =
      await sql`SELECT * FROM order_notes WHERE order_id = ANY(SELECT id FROM orders WHERE cmo_id = ${cmoId}::TEXT) ORDER BY created_at ASC`

    return orderRows.map((o) =>
      mapDbOrderToOrder(
        o,
        noteRows.filter((n) => n.order_id === o.id),
      ),
    )
  } catch (error) {
    console.error("[DB] getOrdersByCmoId error:", error)
    return []
  }
}

export async function createOrder(order: Omit<Order, "id" | "createdAt" | "updatedAt" | "notes">): Promise<Order> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  try {
    const fotoSurveyJson = JSON.stringify(order.fotoSurvey || [])

    await sql`
      INSERT INTO orders (
        id, sales_id, sales_name, merk, dealer, nama_nasabah, no_hp, nama_pasangan, type_unit, jenis_pembiayaan,
        otr, tdp, tenor, angsuran, nama_program, cmo_id, cmo_name, status, created_at, updated_at,
        foto_ktp_nasabah, foto_ktp_pasangan, foto_kk, foto_survey, hasil_slik, catatan_khusus,
        checklist_ktp_pemohon, checklist_ktp_pasangan, checklist_kartu_keluarga, checklist_npwp, checklist_bkr,
        checklist_livin, checklist_rek_tabungan, checklist_muf_app
      )
      VALUES (
        ${id}::TEXT, ${order.salesId}::TEXT, ${order.salesName}, ${order.merk}, ${order.dealer}, ${order.namaNasabah},
        ${order.noHp}, ${order.namaPasangan || null}, ${order.typeUnit}, ${order.jenisPembiayaan},
        ${order.otr}, ${order.tdp}, ${order.tenor}, ${order.angsuran}, ${order.namaProgram}, ${order.cmoId || null}::TEXT, ${order.cmoName || null}, ${order.status},
        ${now}::TIMESTAMP, ${now}::TIMESTAMP, ${order.fotoKtpNasabah || null}, ${order.fotoKtpPasangan || null},
        ${order.fotoKk || null}, ${fotoSurveyJson}::JSONB, ${order.hasilSlik || null}, ${order.catatanKhusus || null},
        ${order.checklist?.ktpPemohon || false}, ${order.checklist?.ktpPasangan || false}, ${order.checklist?.kartuKeluarga || false}, ${order.checklist?.npwp || false}, ${order.checklist?.bkr || false},
        ${order.checklist?.livin || false}, ${order.checklist?.rekTabungan || false}, ${order.checklist?.mufApp || false}
      )
    `

    console.log("[v0] Order inserted to DB successfully:", id)

    return {
      id,
      ...order,
      createdAt: now,
      updatedAt: now,
      notes: [],
    }
  } catch (error) {
    console.error("[v0] createOrder DB error:", error)
    throw new Error(`Gagal menyimpan order ke database: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<void> {
  try {
    if (!id || typeof id !== "string") {
      return
    }
    const fields: string[] = ["updated_at"]
    const values: unknown[] = [new Date().toISOString()]

    if (updates.status !== undefined) {
      fields.push("status")
      values.push(updates.status)
    }
    if (updates.cmoId !== undefined) {
      fields.push("cmo_id")
      values.push(updates.cmoId)
    }
    if (updates.cmoName !== undefined) {
      fields.push("cmo_name")
      values.push(updates.cmoName)
    }
    if (updates.claimedAt !== undefined) {
      fields.push("claimed_at")
      values.push(updates.claimedAt)
    }
    if (updates.claimedBy !== undefined) {
      fields.push("claimed_by")
      values.push(updates.claimedBy)
    }
    if (updates.tanggalSurvey !== undefined) {
      fields.push("tanggal_survey")
      values.push(updates.tanggalSurvey)
    }
    if (updates.fotoKtpNasabah !== undefined) {
      fields.push("foto_ktp_nasabah")
      values.push(updates.fotoKtpNasabah)
    }
    if (updates.fotoKtpPasangan !== undefined) {
      fields.push("foto_ktp_pasangan")
      values.push(updates.fotoKtpPasangan)
    }
    if (updates.fotoKk !== undefined) {
      fields.push("foto_kk")
      values.push(updates.fotoKk)
    }
    if (updates.fotoSurvey !== undefined) {
      fields.push("foto_survey")
      // Ensure it's a proper JSON string for JSONB column
      values.push(JSON.stringify(updates.fotoSurvey || []))
    }
    if (updates.hasilSlik !== undefined) {
      fields.push("hasil_slik")
      values.push(updates.hasilSlik)
    }
    if (updates.slikResult !== undefined) {
      fields.push("slik_result")
      values.push(updates.slikResult)
    }
    if (updates.bandingReason !== undefined) {
      fields.push("banding_reason")
      values.push(updates.bandingReason)
    }
    if (updates.cmhDecisionReason !== undefined) {
      fields.push("cmh_decision_reason")
      values.push(updates.cmhDecisionReason)
    }
    if (updates.catatanKhusus !== undefined) {
      fields.push("catatan_khusus")
      values.push(updates.catatanKhusus)
    }
    if (updates.checklist !== undefined) {
      fields.push(
        "checklist_ktp_pemohon",
        "checklist_ktp_pasangan",
        "checklist_kartu_keluarga",
        "checklist_npwp",
        "checklist_bkr",
        "checklist_livin",
        "checklist_rek_tabungan",
        "checklist_muf_app",
      )
      values.push(
        updates.checklist.ktpPemohon,
        updates.checklist.ktpPasangan,
        updates.checklist.kartuKeluarga,
        updates.checklist.npwp,
        updates.checklist.bkr,
        updates.checklist.livin,
        updates.checklist.rekTabungan,
        updates.checklist.mufApp,
      )
    }
    if (updates.notes !== undefined) {
      fields.push("notes")
      values.push(JSON.stringify(updates.notes))
    }

    const setClause = fields
      .map((f, i) => {
        // Add JSONB type cast for foto_survey field
        if (f === "foto_survey") {
          return `${f} = $${i + 2}::JSONB`
        }
        return `${f} = $${i + 2}`
      })
      .join(", ")

    await sql.query(`UPDATE orders SET ${setClause} WHERE id = $1`, [id, ...values])
  } catch (error) {
    console.error("[DB] updateOrder error:", error)
    throw error
  }
}

export async function addOrderNote(orderId: string, note: OrderNote): Promise<void> {
  try {
    if (!orderId || typeof orderId !== "string") {
      return
    }
    await sql`
      INSERT INTO order_notes (id, order_id, user_id, user_name, user_role, content, created_at)
      VALUES (${note.id}::TEXT, ${orderId}::TEXT, ${note.userId}::TEXT, ${note.userName}, ${note.role}, ${note.content}, ${note.createdAt}::TIMESTAMP)
    `
  } catch (error) {
    console.error("[DB] addOrderNote error:", error)
  }
}

export async function deleteOrder(id: string): Promise<void> {
  try {
    if (!id || typeof id !== "string") {
      return
    }
    await sql`DELETE FROM order_notes WHERE order_id = ${id}::TEXT`
    await sql`DELETE FROM orders WHERE id = ${id}::TEXT`
  } catch (error) {
    console.error("[DB] deleteOrder error:", error)
  }
}

// ==================== SIMULASI OPERATIONS ====================

export async function createSimulasi(simulasi: Omit<SimulasiKredit, "id" | "createdAt">): Promise<void> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const hasilSimulasi = simulasi.hasilSimulasi || (simulasi as any).results || []

  if (!Array.isArray(hasilSimulasi) || hasilSimulasi.length === 0) {
    throw new Error("hasil_simulasi is required and cannot be empty")
  }

  await sql`
    INSERT INTO simulasi (id, user_id, user_name, merk, dealer, jenis_pembiayaan, nama_program, otr, mode, tdp, angsuran, cmo_id, cmo_name, hasil_simulasi, created_at)
    VALUES (
      ${id}::TEXT, 
      ${simulasi.userId}::TEXT, 
      ${simulasi.userName}, 
      ${simulasi.merk}, 
      ${simulasi.dealer}, 
      ${simulasi.jenisPembiayaan}, 
      ${simulasi.namaProgram}, 
      ${simulasi.otr}, 
      ${simulasi.mode}, 
      ${simulasi.tdp || null}, 
      ${simulasi.angsuran || null}, 
      ${simulasi.cmoId || null}::TEXT, 
      ${simulasi.cmoName || null}, 
      ${JSON.stringify(hasilSimulasi)}::JSONB, 
      ${now}::TIMESTAMP
    )
  `
}

export async function getSimulasiByUserId(userId: string): Promise<SimulasiKredit[]> {
  try {
    if (!userId || typeof userId !== "string") {
      return []
    }
    const rows = await sql`SELECT * FROM simulasi WHERE user_id = ${userId}::TEXT ORDER BY created_at DESC`
    return rows.map((row) => {
      let hasilSimulasi: SimulasiKredit["hasilSimulasi"] = []
      if (row.hasil_simulasi) {
        if (typeof row.hasil_simulasi === "string") {
          try {
            hasilSimulasi = JSON.parse(row.hasil_simulasi)
          } catch {
            hasilSimulasi = []
          }
        } else if (Array.isArray(row.hasil_simulasi)) {
          hasilSimulasi = row.hasil_simulasi
        }
      }

      return {
        id: row.id as string,
        userId: row.user_id as string,
        userName: row.user_name as string,
        merk: row.merk as string,
        dealer: row.dealer as string,
        jenisPembiayaan: row.jenis_pembiayaan as SimulasiKredit["jenisPembiayaan"],
        namaProgram: row.nama_program as string,
        otr: Number(row.otr),
        mode: row.mode as "tdp" | "angsuran",
        tdp: row.tdp ? Number(row.tdp) : undefined,
        angsuran: row.angsuran ? Number(row.angsuran) : undefined,
        cmoId: row.cmo_id as string | undefined,
        cmoName: row.cmo_name as string | undefined,
        hasilSimulasi,
        createdAt: toISOString(row.created_at as Date | string),
      }
    })
  } catch (error) {
    console.error("[DB] getSimulasiByUserId error:", error)
    return []
  }
}

// ==================== AKTIVITAS OPERATIONS ====================

export async function createAktivitas(aktivitas: {
  userId: string
  userName: string
  role: string
  jenisAktivitas: string
  tanggal: string
  picDealer: string
  dealer: string
  fotoAktivitas?: string[]
}): Promise<void> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await sql`
    INSERT INTO aktivitas (id, user_id, user_name, role, jenis_aktivitas, tanggal, pic_dealer, dealer, foto_aktivitas, created_at)
    VALUES (
      ${id}::TEXT, 
      ${aktivitas.userId}::TEXT, 
      ${aktivitas.userName}, 
      ${aktivitas.role}, 
      ${aktivitas.jenisAktivitas}, 
      ${aktivitas.tanggal}::DATE, 
      ${aktivitas.picDealer}, 
      ${aktivitas.dealer}, 
      ${aktivitas.fotoAktivitas || []}::TEXT[], 
      ${now}::TIMESTAMP
    )
  `
}

export interface AktivitasDB {
  id: string
  userId: string
  userName: string
  role: string
  jenisAktivitas: string
  tanggal: string
  picDealer: string
  dealer: string
  fotoAktivitas: string[]
  createdAt: string
}

export async function getAktivitas(): Promise<AktivitasDB[]> {
  try {
    const rows = await sql`SELECT * FROM aktivitas ORDER BY created_at DESC`
    return rows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      userName: row.user_name as string,
      role: row.role as string,
      jenisAktivitas: row.jenis_aktivitas as string,
      tanggal: toISOString(row.tanggal as Date | string),
      picDealer: row.pic_dealer as string,
      dealer: row.dealer as string,
      fotoAktivitas: (row.foto_aktivitas as string[]) || [],
      createdAt: toISOString(row.created_at as Date | string),
    }))
  } catch (error) {
    console.error("[DB] getAktivitas error:", error)
    return []
  }
}

export async function getAktivitasByUserId(userId: string): Promise<AktivitasDB[]> {
  try {
    if (!userId || typeof userId !== "string") {
      return []
    }
    const rows = await sql`SELECT * FROM aktivitas WHERE user_id = ${userId}::TEXT ORDER BY created_at DESC`
    return rows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      userName: row.user_name as string,
      role: row.role as string,
      jenisAktivitas: row.jenis_aktivitas as string,
      tanggal: toISOString(row.tanggal as Date | string),
      picDealer: row.pic_dealer as string,
      dealer: row.dealer as string,
      fotoAktivitas: (row.foto_aktivitas as string[]) || [],
      createdAt: toISOString(row.created_at as Date | string),
    }))
  } catch (error) {
    console.error("[DB] getAktivitasByUserId error:", error)
    return []
  }
}

export async function deleteAktivitas(id: string): Promise<void> {
  try {
    if (!id || typeof id !== "string") {
      return
    }
    await sql`DELETE FROM aktivitas WHERE id = ${id}::TEXT`
  } catch (error) {
    console.error("[DB] deleteAktivitas error:", error)
    throw error
  }
}

// ==================== DEALER OPERATIONS ====================

export async function getDealers(): Promise<Dealer[]> {
  try {
    const rows = await sql`SELECT * FROM dealers ORDER BY nama_dealer ASC`
    return rows.map((row) => ({
      id: row.id as string,
      kodeDealer: row.kode_dealer as string,
      merk: row.merk as string,
      namaDealer: row.nama_dealer as string,
      alamat: (row.alamat as string) || undefined,
      noTelp: (row.no_telp as string) || undefined,
      isActive: row.is_active as boolean,
      createdAt: toISOString(row.created_at as Date | string),
    }))
  } catch (error) {
    console.error("[DB] getDealers error:", error)
    return []
  }
}

export async function getDealersByMerk(merk: string): Promise<Dealer[]> {
  try {
    const rows = await sql`SELECT * FROM dealers WHERE merk = ${merk} AND is_active = true ORDER BY nama_dealer ASC`
    return rows.map((row) => ({
      id: row.id as string,
      kodeDealer: row.kode_dealer as string,
      merk: row.merk as string,
      namaDealer: row.nama_dealer as string,
      alamat: (row.alamat as string) || undefined,
      noTelp: (row.no_telp as string) || undefined,
      isActive: row.is_active as boolean,
      createdAt: toISOString(row.created_at as Date | string),
    }))
  } catch (error) {
    console.error("[DB] getDealersByMerk error:", error)
    return []
  }
}

export async function createDealer(dealer: Omit<Dealer, "createdAt">): Promise<Dealer | null> {
  try {
    const id = dealer.id || crypto.randomUUID()
    const now = new Date().toISOString()

    // Check if dealer already exists
    const existing = await sql`SELECT id FROM dealers WHERE id = ${id}`

    if (existing.length > 0) {
      await sql`
        UPDATE dealers SET
          kode_dealer = ${dealer.kodeDealer},
          merk = ${dealer.merk},
          nama_dealer = ${dealer.namaDealer},
          alamat = ${dealer.alamat || null},
          no_telp = ${dealer.noTelp || null},
          is_active = ${dealer.isActive}
        WHERE id = ${id}
      `
    } else {
      await sql`
        INSERT INTO dealers (id, kode_dealer, merk, nama_dealer, alamat, no_telp, is_active, created_at)
        VALUES (${id}, ${dealer.kodeDealer}, ${dealer.merk}, ${dealer.namaDealer}, ${dealer.alamat || null}, ${dealer.noTelp || null}, ${dealer.isActive}, ${now})
      `
    }

    return {
      ...dealer,
      id,
      createdAt: now,
    }
  } catch (error) {
    console.error("[DB] createDealer error:", error)
    return null
  }
}

export async function deleteDealer(id: string): Promise<boolean> {
  try {
    await sql`DELETE FROM dealers WHERE id = ${id}`
    return true
  } catch (error) {
    console.error("[DB] deleteDealer error:", error)
    return false
  }
}

// ==================== MERK OPERATIONS ====================

export async function getMerks(): Promise<{ id: number; nama: string; isDefault: boolean; isActive: boolean }[]> {
  try {
    const result =
      await sql`SELECT id, nama, is_default, is_active FROM merks WHERE is_active = true ORDER BY is_default DESC, nama ASC`
    return result.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      nama: row.nama as string,
      isDefault: row.is_default as boolean,
      isActive: row.is_active as boolean,
    }))
  } catch (error) {
    console.error("[DB] getMerks error:", error)
    return []
  }
}

export async function createMerk(nama: string, isDefault = false): Promise<{ id: number; nama: string } | null> {
  try {
    const result = await sql`
      INSERT INTO merks (nama, is_default) 
      VALUES (${nama.toUpperCase()}, ${isDefault}) 
      ON CONFLICT (nama) DO UPDATE SET is_active = true
      RETURNING id, nama
    `
    if (result.length > 0) {
      return { id: result[0].id as number, nama: result[0].nama as string }
    }
    return null
  } catch (error) {
    console.error("[DB] createMerk error:", error)
    return null
  }
}

export async function updateMerk(id: number, nama: string): Promise<boolean> {
  try {
    await sql`UPDATE merks SET nama = ${nama.toUpperCase()} WHERE id = ${id}`
    return true
  } catch (error) {
    console.error("[DB] updateMerk error:", error)
    return false
  }
}

export async function deleteMerk(id: number): Promise<boolean> {
  try {
    // Soft delete - just set is_active to false
    await sql`UPDATE merks SET is_active = false WHERE id = ${id} AND is_default = false`
    return true
  } catch (error) {
    console.error("[DB] deleteMerk error:", error)
    return false
  }
}
