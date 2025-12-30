// Format angka ke format Rupiah
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Parse string Rupiah ke number
export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "")
  return Number.parseInt(cleaned, 10) || 0
}

// Format tanggal ke format Indonesia
export function formatTanggal(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

// Format tanggal dan waktu
export function formatTanggalWaktu(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

// Capitalize each word
export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Uppercase all
export function toUpperCase(str: string): string {
  return str.toUpperCase()
}

// Validasi password
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Minimal 8 karakter")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Harus mengandung huruf kecil")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Harus mengandung huruf besar")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Harus mengandung angka")
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push("Harus mengandung karakter khusus (!@#$%^&*)")
  }

  return { valid: errors.length === 0, errors }
}

// Validasi nomor HP
export function validateNoHp(noHp: string): { valid: boolean; error?: string } {
  const cleaned = noHp.replace(/\D/g, "")
  if (cleaned.length === 0) {
    return { valid: false, error: "Nomor HP harus diisi" }
  }
  if (cleaned.length > 13) {
    return { valid: false, error: "Nomor HP maksimal 13 angka" }
  }
  return { valid: true }
}

// Filter hanya angka untuk input
export function onlyNumbers(value: string): string {
  return value.replace(/\D/g, "").slice(0, 13)
}
