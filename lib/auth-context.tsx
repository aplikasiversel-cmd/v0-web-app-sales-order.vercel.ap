"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User, UserRole } from "./types"
import { userStore, sessionStore, generateUsername } from "./data-store"
import { initializeDefaultData } from "@/app/actions/firebase-actions"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; requirePasswordChange?: boolean }>
  register: (data: {
    namaLengkap: string
    noHp: string
    merk: string
    dealer: string
    password: string
    role?: "sales" | "spv"
    spvId?: string
    spvName?: string
  }) => Promise<{ success: boolean; error?: string; username?: string }>
  logout: () => void
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  updateUser: (updates: Partial<User>) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        initializeDefaultData().catch(() => {})

        const storedUser = sessionStore.get()
        if (storedUser) {
          if (!storedUser.id) {
            sessionStore.clear()
            setUser(null)
            setIsLoading(false)
            return
          }

          try {
            const freshUser = await userStore.getById(storedUser.id)
            if (freshUser && freshUser.isActive) {
              setUser(freshUser)
              sessionStore.set(freshUser)
            } else {
              sessionStore.clear()
              setUser(null)
            }
          } catch (error) {
            sessionStore.clear()
            setUser(null)
          }
        }
      } catch (error) {
        sessionStore.clear()
        setUser(null)
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const usernameLC = username.toLowerCase()
      let foundUser = await userStore.getByUsername(usernameLC)

      if (!foundUser && usernameLC === "admin") {
        try {
          await initializeDefaultData()
          foundUser = await userStore.getByUsername(usernameLC)
        } catch {
          // Ignore init errors
        }
      }

      if (!foundUser) {
        return { success: false, error: "Username tidak ditemukan" }
      }

      if (!foundUser.isActive) {
        return { success: false, error: "Akun tidak aktif" }
      }

      if (foundUser.password !== password) {
        return { success: false, error: "Password salah" }
      }

      setUser(foundUser)
      sessionStore.set(foundUser)

      if (foundUser.isFirstLogin) {
        return { success: true, requirePasswordChange: true }
      }

      if (foundUser.passwordLastChanged) {
        const lastChanged = new Date(foundUser.passwordLastChanged)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays >= 30) {
          return { success: true, requirePasswordChange: true }
        }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Terjadi kesalahan saat login" }
    }
  }

  const register = async (data: {
    namaLengkap: string
    noHp: string
    merk: string
    dealer: string
    password: string
    role?: "sales" | "spv"
    spvId?: string
    spvName?: string
  }) => {
    try {
      const username = generateUsername(data.namaLengkap)
      const userRole: UserRole = data.role || "sales"

      const newUser = await userStore.add({
        username,
        password: data.password,
        namaLengkap: data.namaLengkap.toUpperCase(),
        role: userRole,
        noHp: data.noHp,
        merk: data.merk,
        dealer: data.dealer,
        isFirstLogin: false,
        passwordLastChanged: new Date().toISOString(),
        isActive: true,
        spvId: data.spvId || undefined,
        spvName: data.spvName || undefined,
      })

      setUser(newUser)
      sessionStore.set(newUser)

      return { success: true, username }
    } catch (error) {
      return { success: false, error: "Terjadi kesalahan saat registrasi" }
    }
  }

  const logout = () => {
    setUser(null)
    sessionStore.clear()
  }

  const changePassword = async (newPassword: string) => {
    if (!user) {
      return { success: false, error: "Tidak ada user yang login" }
    }

    try {
      const updates = {
        password: newPassword,
        isFirstLogin: false,
        passwordLastChanged: new Date().toISOString(),
      }

      await userStore.update(user.id, updates)
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      sessionStore.set(updatedUser)

      return { success: true }
    } catch (error) {
      return { success: false, error: "Terjadi kesalahan saat mengubah password" }
    }
  }

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return
    try {
      await userStore.update(user.id, updates)
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      sessionStore.set(updatedUser)
    } catch (error) {
      // Silent failure
    }
  }

  const refreshUser = async () => {
    if (user) {
      try {
        const freshUser = await userStore.getById(user.id)
        if (freshUser) {
          setUser(freshUser)
          sessionStore.set(freshUser)
        }
      } catch (error) {
        // Silent failure
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, changePassword, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
