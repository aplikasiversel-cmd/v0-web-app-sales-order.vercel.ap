import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PASSWORD_REQUIREMENTS = [
  { label: "Minimal 8 karakter", test: (p: string) => p.length >= 8 },
  { label: "Huruf besar (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Huruf kecil (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Angka (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Karakter khusus (!@#$%^&*)", test: (p: string) => /[!@#$%^&*]/.test(p) },
]

export function validatePassword(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password))
}

export function generateUsername(name: string): string {
  const cleanName = name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .trim()
  const parts = cleanName.split(/\s+/).filter(Boolean)
  const namePart = parts.slice(0, 3).join("_")
  const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase()
  const randomNum = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `${namePart}_${randomChars}${randomNum}`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
