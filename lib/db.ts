import { neon } from "@neondatabase/serverless"

export const sql = neon(process.env.DATABASE_URL!)

export type DbUser = {
  id: string
  username: string
  password: string
  nama_lengkap: string
  role: "sales" | "cmo" | "cmh" | "admin"
  no_hp: string | null
  merk: string | null
  dealer: string | null
  jabatan: string | null
  is_first_login: boolean
  password_last_changed: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DbProgram = {
  id: string
  nama_program: string
  jenis_pembiayaan: string
  merk: string
  tdp_persen: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DbTenorBunga = {
  id: string
  program_id: string
  tenor: number
  bunga: number
  is_active: boolean
}

export type DbOrder = {
  id: string
  sales_id: string
  sales_name: string
  nama_nasabah: string
  foto_ktp_nasabah: string | null
  nama_pasangan: string | null
  foto_ktp_pasangan: string | null
  foto_kk: string | null
  no_hp: string
  type_unit: string
  merk: string
  dealer: string
  jenis_pembiayaan: string
  nama_program: string
  otr: number
  tdp: number
  angsuran: number
  tenor: number
  cmo_id: string
  cmo_name: string
  catatan_khusus: string | null
  status: string
  hasil_slik: string | null
  tanggal_survey: string | null
  checklist_ktp_pemohon: boolean
  checklist_ktp_pasangan: boolean
  checklist_kartu_keluarga: boolean
  checklist_npwp: boolean
  checklist_bkr: boolean
  checklist_livin: boolean
  checklist_rek_tabungan: boolean
  checklist_muf_app: boolean
  foto_survey: string[] | null
  claimed_by: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}

export type DbOrderNote = {
  id: string
  order_id: string
  user_id: string
  user_name: string
  role: string
  note: string
  status: string
  created_at: string
}
