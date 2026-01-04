"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "./types"
import { userStore, sessionStore, generateUsername, initializeDefaultData } from "./data-store"

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

let isInitialized = false
const INIT_KEY = "muf_data_initialized_v4"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const wasInitialized = typeof window !== "undefined" && localStorage.getItem(INIT_KEY)

        // Get stored user first for immediate display
        const storedUser = sessionStore.get()
        if (storedUser && storedUser.id && storedUser.isActive) {
          setUser(storedUser)
        }
        setIsLoading(false)

        // Initialize default data in background (only once)
        if (!isInitialized && !wasInitialized) {
          isInitialized = true
          // Delay to not block initial load
          setTimeout(async () => {
            try {
              await initializeDefaultData()
              if (typeof window !== "undefined") {
                localStorage.setItem(INIT_KEY, Date.now().toString())
              }
            } catch (e) {
              // Ignore init errors
            }
          }, 3000)
        }

        // Refresh user data in background
        if (storedUser && storedUser.id) {
          try {
            const freshUser = await userStore.getById(storedUser.id)
            if (freshUser && freshUser.isActive) {
              setUser(freshUser)
              sessionStore.set(freshUser)
            }
          } catch {
            // Keep using stored user on error
          }
        }
      } catch (error) {
        const storedUser = sessionStore.get()
        if (storedUser && storedUser.isActive) {
          setUser(storedUser)
        } else {
          sessionStore.clear()
          setUser(null)
        }
        setIsLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const usernameLC = username.toLowerCase()
      let foundUser = await userStore.getByUsername(usernameLC)

      // If admin not found, try to initialize default data
      if (!foundUser && usernameLC === "admin") {
        try {
          await initializeDefaultData()
          foundUser = await userStore.getByUsername(usernameLC)
        } catch {}
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

      return { success: true }
    } catch (error) {
      console.error("[v0] Login error:", error)
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
      const role = data.role || "sales"

      const newUser = await userStore.add({
        username,
        password: data.password,
        namaLengkap: data.namaLengkap.toUpperCase(),
        nomorHp: data.noHp,
        role,
        merk: data.merk ? [data.merk] : [],
        dealer: data.dealer,
        jabatan: role === "spv" ? "SPV" : undefined,
        isActive: true,
        isFirstLogin: false,
        spvId: data.spvId || "",
        spvName: data.spvName || "",
      })

      return { success: true, username: newUser.username }
    } catch (error) {
      console.error("[v0] Register error:", error)
      return { success: false, error: "Gagal mendaftar" }
    }
  }

  const logout = () => {
    sessionStore.clear()
    setUser(null)
  }

  const changePassword = async (newPassword: string) => {
    if (!user) {
      return { success: false, error: "User tidak ditemukan" }
    }

    try {
      await userStore.update(user.id, {
        password: newPassword,
        isFirstLogin: false,
        passwordLastChanged: new Date().toISOString(),
      })

      const updatedUser = { ...user, password: newPassword, isFirstLogin: false }
      setUser(updatedUser)
      sessionStore.set(updatedUser)

      return { success: true }
    } catch (error) {
      console.error("[v0] Change password error:", error)
      return { success: false, error: "Gagal mengubah password" }
    }
  }

  const updateUser = (updates: Partial<User>) => {
    if (!user) return
    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)
    sessionStore.set(updatedUser)
  }

  const refreshUser = async () => {
    if (!user?.id) return
    try {
      const freshUser = await userStore.getById(user.id)
      if (freshUser) {
        setUser(freshUser)
        sessionStore.set(freshUser)
      }
    } catch {
      // Keep existing user on error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        changePassword,
        updateUser,
        refreshUser,
      }}
    >
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
