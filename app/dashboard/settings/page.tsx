"use client"

import type React from "react"

import { useState } from "react"
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, Save } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { validatePassword } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user, changePassword } = useAuth()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const passwordValidation = newPassword ? validatePassword(newPassword) : { valid: false, errors: [] }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (currentPassword !== user.password) {
      toast({
        title: "Gagal",
        description: "Password saat ini salah",
        variant: "destructive",
      })
      return
    }

    if (!passwordValidation.valid) {
      toast({
        title: "Gagal",
        description: "Password baru tidak memenuhi persyaratan",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Gagal",
        description: "Password baru dan konfirmasi tidak cocok",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await changePassword(newPassword)
      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Password berhasil diubah",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast({
          title: "Gagal",
          description: result.error || "Gagal mengubah password",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Pengaturan" description="Kelola pengaturan akun Anda" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>Detail akun Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={user.namaLengkap} disabled />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user.username} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user.role.toUpperCase()} disabled />
              </div>
              {user.noHp && (
                <div className="space-y-2">
                  <Label>No HP</Label>
                  <Input value={user.noHp} disabled />
                </div>
              )}
              {user.merk && (
                <div className="space-y-2">
                  <Label>Merk</Label>
                  <Input value={user.merk} disabled />
                </div>
              )}
              {user.dealer && (
                <div className="space-y-2">
                  <Label>Dealer</Label>
                  <Input value={user.dealer} disabled />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Ganti Password</CardTitle>
            <CardDescription>Password harus diganti setiap 30 hari</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Password tidak cocok</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !passwordValidation.valid || newPassword !== confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
