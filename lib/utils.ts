import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function generateId(): string {
  return crypto.randomUUID()
}

export const PASSWORD_REQUIREMENTS = [
  { label: "Minimal 8 karakter", test: (p: string) => p.length >= 8 },
  { label: "Huruf besar (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Huruf kecil (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Angka (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Karakter khusus (!@#$%^&*)", test: (p: string) => /[!@#$%^&*]/.test(p) },
]

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  PASSWORD_REQUIREMENTS.forEach((req) => {
    if (!req.test(password || "")) {
      errors.push(req.label)
    }
  })

  return { valid: errors.length === 0, errors }
}

export function generateUsername(name?: string): string {
  // If no name provided, generate random username
  if (!name || typeof name !== "string") {
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase()
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    return `SPV_${randomChars}${randomNum}`
  }

  const cleanName = String(name)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .substring(0, 10)

  const suffix = Math.random().toString(36).substring(2, 8).toLowerCase()
  return `${cleanName}_${suffix}`
}
