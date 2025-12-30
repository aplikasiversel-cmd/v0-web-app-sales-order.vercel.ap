"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { validatePassword } from "@/lib/utils/format"

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, changePassword, isLoading: authLoading } = useAuth()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<{ valid: boolean; errors: string[] }>({
    valid: false,
    errors: [],
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (newPassword) {
      setPasswordValidation(validatePassword(newPassword))
    } else {
      setPasswordValidation({ valid: false, errors: [] })
    }
  }, [newPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!passwordValidation.valid) {
      setError("Password tidak memenuhi persyaratan")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok")
      return
    }

    setIsLoading(true)

    try {
      const result = await changePassword(newPassword)

      if (!result.success) {
        setError(result.error || "Gagal mengubah password")
        return
      }

      router.push("/dashboard")
    } catch {
      setError("Terjadi kesalahan saat mengubah password")
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Ganti Password</CardTitle>
          <CardDescription className="text-center">
            {user?.isFirstLogin
              ? "Anda harus mengganti password setelah login pertama"
              : "Password Anda sudah lebih dari 30 hari, silakan ganti password"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru *</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Masukkan Password Baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {newPassword && (
                <div className="space-y-1 text-xs">
                  {["Minimal 8 karakter", "Huruf besar", "Huruf kecil", "Angka", "Karakter khusus (!@#$%^&*)"].map(
                    (req, i) => {
                      const checks = [
                        newPassword.length >= 8,
                        /[A-Z]/.test(newPassword),
                        /[a-z]/.test(newPassword),
                        /[0-9]/.test(newPassword),
                        /[!@#$%^&*]/.test(newPassword),
                      ]
                      return (
                        <div key={i} className="flex items-center gap-1">
                          {checks[i] ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={checks[i] ? "text-green-600" : "text-red-600"}>{req}</span>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Konfirmasi Password Baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Password tidak cocok</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordValidation.valid || newPassword !== confirmPassword}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Password Baru
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
