// Tipe data untuk aplikasi MUF Order Management

export type UserRole = "sales" | "cmo" | "cmh" | "admin" | "spv"

export type JenisPembiayaan = "Passenger" | "Pick Up" | "Pass Comm" | "Truck" | "EV (Listrik)"

export type OrderStatus = "Baru" | "Claim" | "Cek Slik" | "Proses" | "Pertimbangkan" | "Map In" | "Approve" | "Reject"

export interface User {
  id: string
  username: string
  password: string
  namaLengkap: string
  role: UserRole
  noHp?: string
  merk?: string
  dealer?: string
  jabatan?: string
  isFirstLogin: boolean
  passwordLastChanged?: string
  isActive: boolean
  createdAt: string
  cmhId?: string
  cmhName?: string
  spvId?: string
  spvName?: string
}

export interface Dealer {
  id: string
  kodeDealer: string
  merk: string
  namaDealer: string
  alamat?: string
  noTelp?: string
  isActive: boolean
  createdAt?: string // added createdAt as optional
}

export interface Program {
  id: string
  namaProgram: string
  jenisPembiayaan: JenisPembiayaan
  merk: string
  tdpPersen: number
  tenorBunga: {
    tenor: number
    bunga: number
    isActive?: boolean // Made isActive optional
  }[]
  isActive: boolean
}

export interface Order {
  id: string
  salesId: string
  salesName: string
  namaNasabah: string
  fotoKtpNasabah?: string
  namaPasangan?: string
  fotoKtpPasangan?: string
  fotoKk?: string
  noHp: string
  typeUnit: string
  merk: string
  dealer: string
  jenisPembiayaan: JenisPembiayaan
  namaProgram: string
  otr: number
  tdp: number
  angsuran: number
  tenor: number
  cmoId: string
  cmoName: string
  catatanKhusus?: string
  status: OrderStatus
  notes: OrderNote[]
  hasilSlik?: string
  tanggalSurvey?: string
  checklist?: OrderChecklist
  fotoSurvey?: string[]
  createdAt: string
  updatedAt: string
  claimedBy?: string
  claimedAt?: string
}

export interface OrderNote {
  id: string
  orderId?: string // Add orderId field for linking to order
  userId: string
  userName: string
  role: UserRole
  note: string
  status: OrderStatus
  createdAt: string
}

export interface OrderChecklist {
  ktpPemohon: boolean
  ktpPasangan: boolean
  kartuKeluarga: boolean
  npwp: boolean
  bkr: boolean
  livin: boolean
  rekTabungan: boolean
  mufApp: boolean
}

export interface SimulasiKredit {
  id: string
  userId: string
  userName: string
  merk: string
  dealer: string
  jenisPembiayaan: JenisPembiayaan
  namaProgram: string
  otr: number
  mode: "tdp" | "angsuran"
  tdp?: number
  angsuran?: number
  cmoId?: string
  cmoName?: string
  hasilSimulasi: SimulasiResult[]
  createdAt: string
}

export interface SimulasiResult {
  tenor: number
  tdp: number
  angsuran: number
  bunga: number
  totalBayar: number
}

export interface Aktivitas {
  id: string
  userId: string
  userName: string
  role: UserRole
  jenisAktivitas: "Kunjungan Dealer" | "Event Dealer" | "Pameran"
  tanggal: string
  picDealer: string
  dealer: string
  fotoAktivitas: string[]
  createdAt: string
}

// Data awal dealer berdasarkan merk
export const DEALER_BY_MERK: Record<string, string[]> = {
  Honda: ["ISTANA MOBIL TRIO MOTOR", "ISTANA MOBIL TRIO BANJARMASIN", "ISTANA MOBIL TRIO RAYA"],
  Daihatsu: [
    "ASTRA DAIHATSU-BANJARMASIN",
    "ASTRA DAIHATSU TBK – BANJARBARU",
    "TRI MANDIRI SELARAS-MRTPURA",
    "TRI MANDIRI SEJATI-KBN BNGA",
    "TRI MANDIRI SELARAS-KAYUTANGI",
  ],
  Mitsubishi: ["BARITO BERLIAN MOTOR", "SUMBER BERLIAN MOTORS"],
  Suzuki: ["MITRA MEGAH PROFITAMAS"],
  Toyota: ["AUTO 2000 BANJARMASIN"],
  Chery: ["AVANTE EKSA MOBILINDO - BANJARMASIN"],
  Hyundai: ["ASIA MOBIL INTERNATIONAL"],
  Wuling: ["ARISTA JAYA LESTARI-BNJRMSI", "ARISTA ELEKTRIKA PIK"],
  BYD: ["ARISTA JAYA LESTARI-BNJRMSI", "ARISTA ELEKTRIKA PIK"],
  Isuzu: ["ASTRA ISUZU-A YANI BANJARMASIN"],
  Nissan: ["WAHANA DELTA PRIMA BNJRMSIN"],
  Kia: ["WAHANA DELTA PRIMA BNJRMSIN"],
  Citroen: ["WAHANA DELTA PRIMA BNJRMSIN"],
  Mazda: ["PRIMA HARAPAN MOTOR"],
  Hino: ["MITRA PROFITAMAS MOTOR"],
}

export const MERK_LIST = Object.keys(DEALER_BY_MERK)

export const JENIS_PEMBIAYAAN: JenisPembiayaan[] = ["Passenger", "Pick Up", "Pass Comm", "Truck", "EV (Listrik)"]
