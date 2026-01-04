"use client"

import type React from "react"
import type { User, Program, JenisPembiayaan, Order } from "@/lib/types"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { InputRupiah } from "@/components/ui/input-rupiah"
import { InputPhone } from "@/components/ui/input-phone"
import { useAuth } from "@/lib/auth-context"
import { userStore, programStore, orderStore } from "@/lib/data-store"
import { JENIS_PEMBIAYAAN } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { formatRupiah } from "@/lib/utils"
import { Save, Upload, X, Loader2 } from "lucide-react"
import { notifyNewOrder } from "@/app/actions/notification-actions"
import Image from "next/image"

interface OrderFormData {
  namaNasabah: string
  noHp: string
  namaPasangan: string
  jenisPembiayaan: JenisPembiayaan | ""
  namaProgram: string
  typeUnit: string
  otr: number
  tdp: number
  tenor: number
  angsuran: number
  cmoId: string
  catatanKhusus: string
  fotoKtpNasabah: string
  fotoKtpPasangan: string
  fotoKk: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(authUser)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cmoList, setCmoList] = useState<User[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [formData, setFormData] = useState<OrderFormData>({
    namaNasabah: "",
    noHp: "",
    namaPasangan: "",
    jenisPembiayaan: "",
    namaProgram: "",
    typeUnit: "",
    otr: 0,
    tdp: 0,
    tenor: 0,
    angsuran: 0,
    cmoId: "",
    catatanKhusus: "",
    fotoKtpNasabah: "",
    fotoKtpPasangan: "",
    fotoKk: "",
  })

  const userMerk = user?.merk || ""
  const userDealer = user?.dealer || ""

  const filteredPrograms = useMemo(() => {
    if (!userMerk || !formData.jenisPembiayaan || !Array.isArray(programs)) return []
    return programs.filter((p) => p.merk === userMerk && p.jenisPembiayaan === formData.jenisPembiayaan && p.isActive)
  }, [userMerk, formData.jenisPembiayaan, programs])

  const uniqueCmoList = useMemo(() => {
    const seen = new Set<string>()
    return cmoList.filter((cmo) => {
      // Filter by username to remove duplicates
      if (seen.has(cmo.username)) return false
      seen.add(cmo.username)
      return cmo.isActive
    })
  }, [cmoList])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [cmoData, programData] = await Promise.all([userStore.getByRole("cmo"), programStore.getAll()])
        setCmoList(Array.isArray(cmoData) ? cmoData : [])
        setPrograms(Array.isArray(programData) ? programData : [])
      } catch (error) {
        console.error("Error loading data:", error)
        setCmoList([])
        setPrograms([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    setFormData((prev) => ({ ...prev, namaProgram: "", tenor: 0, angsuran: 0 }))
    setSelectedProgram(null)
  }, [formData.jenisPembiayaan])

  useEffect(() => {
    if (formData.namaProgram) {
      const program = programs.find((p) => p.namaProgram === formData.namaProgram)
      setSelectedProgram(program || null)
    } else {
      setSelectedProgram(null)
    }
  }, [formData.namaProgram, programs])

  const tdpMinimumRupiah = useMemo(() => {
    if (!selectedProgram || formData.otr <= 0) return 0
    return Math.round((selectedProgram.tdpPersen / 100) * formData.otr)
  }, [selectedProgram, formData.otr])

  const availableTenors = useMemo(() => {
    if (!selectedProgram || !Array.isArray(selectedProgram.tenorBunga)) return []
    return selectedProgram.tenorBunga.filter((tb) => tb.isActive !== false)
  }, [selectedProgram])

  useEffect(() => {
    if (!selectedProgram || formData.otr <= 0 || formData.tdp <= 0 || formData.tenor <= 0) {
      return
    }

    const tenorData = availableTenors.find((tb) => tb.tenor === formData.tenor)
    if (!tenorData) return

    const pokokPinjaman = formData.otr - formData.tdp
    const bungaPerBulan = tenorData.bunga / 100 / 12
    const angsuran =
      (pokokPinjaman * (bungaPerBulan * Math.pow(1 + bungaPerBulan, tenorData.tenor))) /
      (Math.pow(1 + bungaPerBulan, tenorData.tenor) - 1)

    setFormData((prev) => ({ ...prev, angsuran: Math.round(angsuran) }))
  }, [formData.otr, formData.tdp, formData.tenor, selectedProgram, availableTenors])

  const handleFileChange = async (field: "fotoKtpNasabah" | "fotoKtpPasangan" | "fotoKk", file: File | null) => {
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Terlalu Besar",
        description: "Ukuran file maksimal 5MB",
        variant: "destructive",
      })
      return
    }

    try {
      const compressedDataUrl = await compressImage(file, 800, 0.7)
      setFormData((prev) => ({ ...prev, [field]: compressedDataUrl }))
    } catch (error) {
      console.error("Error processing image:", error)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setFormData((prev) => ({ ...prev, [field]: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const compressImage = (file: File, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          const canvas = document.createElement("canvas")
          let width = img.width
          let height = img.height

          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Failed to get canvas context"))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", quality))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: "Error",
        description: "User tidak ditemukan. Silakan login ulang.",
        variant: "destructive",
      })
      return
    }

    if (!formData.namaNasabah.trim()) {
      toast({
        title: "Form Tidak Lengkap",
        description: "Nama Nasabah wajib diisi",
        variant: "destructive",
      })
      return
    }

    if (!formData.noHp.trim()) {
      toast({
        title: "Form Tidak Lengkap",
        description: "No HP wajib diisi",
        variant: "destructive",
      })
      return
    }

    if (!formData.typeUnit.trim()) {
      toast({
        title: "Form Tidak Lengkap",
        description: "Type Unit wajib diisi",
        variant: "destructive",
      })
      return
    }

    if (!formData.jenisPembiayaan) {
      toast({
        title: "Form Tidak Lengkap",
        description: "Jenis Pembiayaan wajib dipilih",
        variant: "destructive",
      })
      return
    }

    if (!formData.namaProgram) {
      toast({
        title: "Form Tidak Lengkap",
        description: "Program wajib dipilih",
        variant: "destructive",
      })
      return
    }

    if (formData.otr <= 0) {
      toast({
        title: "Form Tidak Lengkap",
        description: "OTR wajib diisi",
        variant: "destructive",
      })
      return
    }

    if (formData.tdp <= 0) {
      toast({
        title: "Form Tidak Lengkap",
        description: "TDP wajib diisi",
        variant: "destructive",
      })
      return
    }

    if (formData.tenor <= 0) {
      toast({
        title: "Form Tidak Lengkap",
        description: "Tenor wajib dipilih",
        variant: "destructive",
      })
      return
    }

    if (tdpMinimumRupiah > 0 && formData.tdp < tdpMinimumRupiah) {
      toast({
        title: "TDP Kurang",
        description: `TDP minimum adalah ${formatRupiah(tdpMinimumRupiah)}`,
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const cmo = cmoList.find((c) => c.id === formData.cmoId)

      const newOrder: Omit<Order, "id" | "createdAt" | "updatedAt" | "notes"> = {
        salesId: user.id,
        salesName: user.namaLengkap,
        namaNasabah: formData.namaNasabah.toUpperCase().trim(),
        fotoKtpNasabah: formData.fotoKtpNasabah || undefined,
        namaPasangan: formData.namaPasangan ? formData.namaPasangan.toUpperCase().trim() : undefined,
        fotoKtpPasangan: formData.fotoKtpPasangan || undefined,
        fotoKk: formData.fotoKk || undefined,
        noHp: formData.noHp.trim(),
        typeUnit: formData.typeUnit.toUpperCase().trim(),
        merk: userMerk,
        dealer: userDealer,
        jenisPembiayaan: formData.jenisPembiayaan as JenisPembiayaan,
        namaProgram: formData.namaProgram,
        otr: formData.otr,
        tdp: formData.tdp,
        angsuran: formData.angsuran,
        tenor: formData.tenor,
        cmoId: formData.cmoId || undefined,
        cmoName: cmo?.namaLengkap || undefined,
        catatanKhusus: formData.catatanKhusus ? formData.catatanKhusus.toUpperCase().trim() : undefined,
        status: "Baru",
      }

      const createdOrder = await orderStore.add(newOrder as Order)

      try {
        if (formData.cmoId) {
          await notifyNewOrder(createdOrder.id, newOrder.namaNasabah, user.namaLengkap, user.id, formData.cmoId)
        }
      } catch (notifError) {
        console.error("[DB] Notification error (non-blocking):", notifError)
      }

      toast({
        title: "Order Berhasil Dibuat",
        description: "Order Anda telah berhasil disimpan",
      })

      router.push("/dashboard/tracking")
    } catch (error) {
      console.error("[v0] Error creating order:", error)
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan order"
      toast({
        title: "Gagal Menyimpan Order",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Order Baru"
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Order Baru" }]}
      />

      <main className="flex-1 p-4 md:p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Data Nasabah */}
            <Card>
              <CardHeader>
                <CardTitle>Data Nasabah</CardTitle>
                <CardDescription>Informasi data nasabah</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="namaNasabah">Nama Nasabah *</Label>
                  <Input
                    id="namaNasabah"
                    placeholder="Nama lengkap sesuai KTP"
                    value={formData.namaNasabah}
                    onChange={(e) => setFormData((prev) => ({ ...prev, namaNasabah: e.target.value.toUpperCase() }))}
                    className="uppercase"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Foto KTP Nasabah</Label>
                  <div className="flex items-center gap-2">
                    {formData.fotoKtpNasabah ? (
                      <div className="relative">
                        <img
                          src={formData.fotoKtpNasabah || "/placeholder.svg"}
                          alt="KTP Nasabah"
                          className="h-20 w-32 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setFormData((prev) => ({ ...prev, fotoKtpNasabah: "" }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex h-20 w-32 cursor-pointer items-center justify-center rounded border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange("fotoKtpNasabah", e.target.files?.[0] || null)}
                        />
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="noHp">No HP *</Label>
                  <InputPhone
                    value={formData.noHp}
                    onChange={(value) => setFormData((prev) => ({ ...prev, noHp: value }))}
                    placeholder="08xxxxxxxxxx"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="namaPasangan">Nama Pasangan</Label>
                  <Input
                    id="namaPasangan"
                    placeholder="Nama lengkap pasangan (opsional)"
                    value={formData.namaPasangan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, namaPasangan: e.target.value.toUpperCase() }))}
                    className="uppercase"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Foto KTP Pasangan</Label>
                  <div className="flex items-center gap-2">
                    {formData.fotoKtpPasangan ? (
                      <div className="relative">
                        <img
                          src={formData.fotoKtpPasangan || "/placeholder.svg"}
                          alt="KTP Pasangan"
                          className="h-20 w-32 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setFormData((prev) => ({ ...prev, fotoKtpPasangan: "" }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex h-20 w-32 cursor-pointer items-center justify-center rounded border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange("fotoKtpPasangan", e.target.files?.[0] || null)}
                        />
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Foto Kartu Keluarga</Label>
                  <div className="flex items-center gap-2">
                    {formData.fotoKk ? (
                      <div className="relative">
                        <img
                          src={formData.fotoKk || "/placeholder.svg"}
                          alt="Kartu Keluarga"
                          className="h-20 w-32 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setFormData((prev) => ({ ...prev, fotoKk: "" }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex h-20 w-32 cursor-pointer items-center justify-center rounded border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange("fotoKk", e.target.files?.[0] || null)}
                        />
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Kendaraan */}
            <Card>
              <CardHeader>
                <CardTitle>Data Kendaraan</CardTitle>
                <CardDescription>Informasi kendaraan yang akan dibiayai</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="typeUnit">Type Unit *</Label>
                  <Input
                    id="typeUnit"
                    placeholder="Contoh: BRIO RS CVT"
                    value={formData.typeUnit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, typeUnit: e.target.value.toUpperCase() }))}
                    className="uppercase"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Merk</Label>
                  <Input value={userMerk} disabled className="bg-muted" />
                </div>
              </CardContent>
            </Card>

            {/* Data Pembiayaan */}
            <Card>
              <CardHeader>
                <CardTitle>Data Pembiayaan</CardTitle>
                <CardDescription>Informasi pembiayaan kredit</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Jenis Pembiayaan *</Label>
                  <Select
                    value={formData.jenisPembiayaan}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, jenisPembiayaan: value as JenisPembiayaan }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis pembiayaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_PEMBIAYAAN.map((jenis) => (
                        <SelectItem key={jenis} value={jenis}>
                          {jenis}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Program *</Label>
                  <Select
                    value={formData.namaProgram}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, namaProgram: value }))}
                    disabled={!formData.jenisPembiayaan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih program" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPrograms.map((prog) => (
                        <SelectItem key={prog.id} value={prog.namaProgram}>
                          {prog.namaProgram}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>OTR *</Label>
                  <InputRupiah
                    value={formData.otr}
                    onChange={(value) => setFormData((prev) => ({ ...prev, otr: value }))}
                    placeholder="Masukkan harga OTR"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>TDP *</Label>
                  <InputRupiah
                    value={formData.tdp}
                    onChange={(value) => setFormData((prev) => ({ ...prev, tdp: value }))}
                    placeholder="Masukkan TDP"
                  />
                  {selectedProgram && formData.otr > 0 && (
                    <p
                      className={`text-xs ${formData.tdp > 0 && formData.tdp < tdpMinimumRupiah ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                    >
                      TDP Minimum: {formatRupiah(tdpMinimumRupiah)}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Tenor *</Label>
                  <Select
                    value={formData.tenor > 0 ? String(formData.tenor) : ""}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, tenor: Number(value) }))}
                    disabled={!selectedProgram}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tenor" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTenors.map((tb) => (
                        <SelectItem key={tb.tenor} value={String(tb.tenor)}>
                          {tb.tenor} Bulan
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Angsuran</Label>
                  <Input value={formatRupiah(formData.angsuran)} disabled className="bg-muted" />
                </div>
              </CardContent>
            </Card>

            {/* Pilih CMO */}
            <Card>
              <CardHeader>
                <CardTitle>Pilih CMO</CardTitle>
                <CardDescription>Pilih CMO yang akan menangani order ini (opsional)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>CMO</Label>
                  <Select
                    value={formData.cmoId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, cmoId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih CMO (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCmoList.map((cmo) => (
                        <SelectItem key={cmo.id} value={cmo.id}>
                          {cmo.namaLengkap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Catatan Khusus</Label>
                  <Textarea
                    placeholder="Catatan tambahan (opsional)"
                    value={formData.catatanKhusus}
                    onChange={(e) => setFormData((prev) => ({ ...prev, catatanKhusus: e.target.value.toUpperCase() }))}
                    className="uppercase"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
