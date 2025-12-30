"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InputPhone } from "@/components/ui/input-phone"
import { useAuth } from "@/lib/auth-context"
import { DEALER_BY_MERK } from "@/lib/types"
import { validatePassword, validateNoHp } from "@/lib/utils/format"
import { getDealers, getMerks } from "@/app/actions/db-actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RegisterFormProps {
  onLogin: () => void
}

interface DealerItem {
  id: string
  namaDealer: string
  merk: string
}

export function RegisterForm({ onLogin }: RegisterFormProps) {
  const router = useRouter()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    namaLengkap: "",
    noHp: "",
    merk: "",
    dealer: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [allMerks, setAllMerks] = useState<string[]>([])
  const [availableDealers, setAvailableDealers] = useState<DealerItem[]>([])
  const [filteredDealers, setFilteredDealers] = useState<DealerItem[]>([])
  const [passwordValidation, setPasswordValidation] = useState<{ valid: boolean; errors: string[] }>({
    valid: false,
    errors: [],
  })
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [generatedUsername, setGeneratedUsername] = useState("")

  useEffect(() => {
    const loadData = async () => {
      const defaultDealers: DealerItem[] = []
      Object.entries(DEALER_BY_MERK).forEach(([merk, dealers]) => {
        dealers.forEach((dealerName, index) => {
          defaultDealers.push({
            id: `default-${merk}-${index}`,
            namaDealer: dealerName,
            merk: merk,
          })
        })
      })

      let dbMerks: string[] = []
      try {
        const merksFromDb = await getMerks()
        dbMerks = merksFromDb.map((m) => m.nama)
      } catch (error) {
        console.error("Error loading merks from database:", error)
      }

      let dbDealers: DealerItem[] = []
      try {
        const dealersFromDb = await getDealers()
        dbDealers = dealersFromDb
          .filter((d) => d.isActive !== false)
          .map((d) => ({
            id: d.id,
            namaDealer: d.namaDealer,
            merk: d.merk,
          }))
      } catch (error) {
        console.error("Error loading dealers from database:", error)
      }

      const allDealersMap = new Map<string, DealerItem>()

      defaultDealers.forEach((d) => {
        const key = `${d.merk}-${d.namaDealer}`
        allDealersMap.set(key, d)
      })

      dbDealers.forEach((d) => {
        const key = `${d.merk}-${d.namaDealer}`
        allDealersMap.set(key, d)
      })

      const combinedDealers = Array.from(allDealersMap.values())
      setAvailableDealers(combinedDealers)

      const dealerMerks = [...new Set(combinedDealers.map((d) => d.merk))]
      const combinedMerks = [...new Set([...dbMerks, ...dealerMerks])].sort()
      setAllMerks(combinedMerks)
    }

    loadData()
  }, [])

  useEffect(() => {
    if (formData.merk) {
      const filtered = availableDealers.filter((d) => d.merk === formData.merk)
      setFilteredDealers(filtered)
      setFormData((prev) => ({ ...prev, dealer: "" }))
    } else {
      setFilteredDealers([])
    }
  }, [formData.merk, availableDealers])

  useEffect(() => {
    if (formData.password) {
      setPasswordValidation(validatePassword(formData.password))
    } else {
      setPasswordValidation({ valid: false, errors: [] })
    }
  }, [formData.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!passwordValidation.valid) {
      setError("Password tidak memenuhi persyaratan")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok")
      return
    }

    const noHpValidation = validateNoHp(formData.noHp)
    if (!noHpValidation.valid) {
      setError(noHpValidation.error || "Nomor HP tidak valid")
      return
    }

    setIsLoading(true)

    try {
      const result = await register({
        namaLengkap: formData.namaLengkap,
        noHp: formData.noHp,
        merk: formData.merk,
        dealer: formData.dealer,
        password: formData.password,
      })

      if (!result.success) {
        setError(result.error || "Pendaftaran gagal")
        return
      }

      setGeneratedUsername(result.username || "")
      setShowSuccessDialog(true)
    } catch {
      setError("Terjadi kesalahan saat pendaftaran")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessDialog(false)
    router.push("/dashboard")
  }

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Daftar Sales</CardTitle>
          <CardDescription className="text-center">Buat Akun Sales Baru</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
              <Input
                id="namaLengkap"
                type="text"
                placeholder="Masukkan Nama Lengkap"
                value={formData.namaLengkap}
                onChange={(e) => setFormData((prev) => ({ ...prev, namaLengkap: e.target.value.toUpperCase() }))}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="noHp">No HP * (Maksimal 13 Angka)</Label>
              <InputPhone
                value={formData.noHp}
                onChange={(value) => setFormData((prev) => ({ ...prev, noHp: value }))}
                placeholder="08xxxxxxxxxx"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merk">Merk *</Label>
              <Select
                value={formData.merk}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, merk: value }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Merk" />
                </SelectTrigger>
                <SelectContent>
                  {allMerks.map((merk) => (
                    <SelectItem key={merk} value={merk}>
                      {merk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dealer">Dealer *</Label>
              <Select
                value={formData.dealer}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, dealer: value }))}
                disabled={isLoading || !formData.merk}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.merk ? "Pilih Dealer" : "Pilih Merk Terlebih Dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredDealers.length > 0 ? (
                    filteredDealers.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.namaDealer}>
                        {dealer.namaDealer}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_no_dealer" disabled>
                      Tidak ada dealer untuk merk ini
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan Password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {formData.password && (
                <div className="space-y-1 text-xs">
                  {["Minimal 8 karakter", "Huruf besar", "Huruf kecil", "Angka", "Karakter khusus (!@#$%^&*)"].map(
                    (req, i) => {
                      const checks = [
                        formData.password.length >= 8,
                        /[A-Z]/.test(formData.password),
                        /[a-z]/.test(formData.password),
                        /[0-9]/.test(formData.password),
                        /[!@#$%^&*]/.test(formData.password),
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
              <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Konfirmasi Password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
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
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500">Password tidak cocok</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordValidation.valid || formData.password !== formData.confirmPassword}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Daftar
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Sudah Punya Akun?{" "}
              <button type="button" onClick={onLogin} className="text-primary hover:underline font-medium">
                Masuk
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Pendaftaran Berhasil
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Akun Anda telah berhasil dibuat.</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Username Anda:</p>
                  <p className="font-mono font-bold text-foreground">{generatedUsername}</p>
                </div>
                <p className="text-sm text-amber-600">Simpan username ini untuk login di kemudian hari.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSuccessClose} className="w-full">
              Lanjut Ke Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
