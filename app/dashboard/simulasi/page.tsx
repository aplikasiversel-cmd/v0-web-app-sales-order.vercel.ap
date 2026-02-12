"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { getMerks, getDealers } from "@/app/actions/db-actions"

import { Calculator, FileText, Save, Eye, History, Loader2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { userStore, programStore, simulasiStore } from "@/lib/data-store"
import type { User, Program, SimulasiKredit } from "@/lib/types"
import { MERK_LIST, DEALER_BY_MERK } from "@/lib/types"
import { formatRupiah, formatTanggal } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function SimulasiPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [programs, setPrograms] = useState<Program[]>([])
  const [cmoList, setCmoList] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [hasilSimulasi, setHasilSimulasi] = useState<any[]>([])
  const [riwayatSimulasi, setRiwayatSimulasi] = useState<SimulasiKredit[]>([])
  const [activeTab, setActiveTab] = useState("simulasi")
  const [tdpBelowMinimum, setTdpBelowMinimum] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const [dbMerks, setDbMerks] = useState<string[]>([])
  const [dbDealers, setDbDealers] = useState<{ merk: string; nama_dealer: string }[]>([])

  const isSalesOrSpv = user?.role === "sales" || user?.role === "spv"
  const userMerk = isSalesOrSpv && user?.merk ? (Array.isArray(user.merk) ? user.merk[0] : user.merk) : ""
  const userDealer = isSalesOrSpv && user?.dealer ? user.dealer : ""

  const [formData, setFormData] = useState({
    merk: userMerk,
    dealer: userDealer,
    jenisPembiayaan: "" as "Passenger" | "Pick Up" | "Pass Comm" | "Truck" | "EV (Listrik)" | "",
    namaProgram: "",
    otr: 0,
    tdp: 0,
    angsuran: 0,
    mode: "tdp" as "tdp" | "angsuran",
    cmoId: "",
  })

  const availableMerks = useMemo(() => {
    return [...new Set([...dbMerks, ...MERK_LIST])]
  }, [dbMerks])

  const availableDealers = useMemo(() => {
    if (!formData.merk) return []
    const dealersFromDefault = DEALER_BY_MERK[formData.merk as keyof typeof DEALER_BY_MERK] || []
    const dealersFromDb = dbDealers.filter((d) => d.merk === formData.merk).map((d) => d.nama_dealer)
    // If no dealers found for this merk, show all dealers from database
    return [
      ...new Set([
        ...dealersFromDefault,
        ...dealersFromDb,
        ...(dealersFromDb.length === 0 && !(dealersFromDefault.length > 0) ? dbDealers.map((d) => d.nama_dealer) : []),
      ]),
    ]
  }, [formData.merk, dbDealers])

  const filteredPrograms = useMemo(() => {
    if (!formData.merk || !formData.jenisPembiayaan || !Array.isArray(programs)) return []
    const merkLower = formData.merk.trim().toLowerCase()
    const jenisLower = formData.jenisPembiayaan.trim().toLowerCase()

    return programs.filter(
      (p) =>
        p.merk?.trim().toLowerCase() === merkLower &&
        p.jenisPembiayaan?.trim().toLowerCase() === jenisLower &&
        p.isActive &&
        // Filter by dealer: show program if no dealers specified OR selected dealer is in the list
        (!p.dealers || p.dealers.length === 0 || (formData.dealer && p.dealers.includes(formData.dealer))),
    )
  }, [formData.merk, formData.jenisPembiayaan, formData.dealer, programs])

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
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [cmos, progs] = await Promise.all([userStore.getByRole("cmo"), programStore.getAll()])
        setCmoList(Array.isArray(cmos) ? cmos : [])
        setPrograms(Array.isArray(progs) ? progs : [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [user])

  useEffect(() => {
    const loadMerksAndDealers = async () => {
      try {
        const [merksData, dealersData] = await Promise.all([getMerks(), getDealers()])
        if (merksData) {
          setDbMerks(merksData.map((m: { nama: string }) => m.nama))
        }
        if (dealersData) {
          setDbDealers(
            dealersData.map((d: { merk: string; namaDealer: string }) => ({
              merk: d.merk,
              nama_dealer: d.namaDealer,
            })),
          )
        }
      } catch (error) {
        console.error("Error loading merks/dealers:", error)
      }
    }
    loadMerksAndDealers()
  }, [])

  useEffect(() => {
    setFormData((prev) => ({ ...prev, namaProgram: "" }))
    setSelectedProgram(null)
    setHasilSimulasi([])
  }, [formData.merk, formData.jenisPembiayaan])

  useEffect(() => {
    if (formData.namaProgram) {
      const program = programs.find((p) => p.namaProgram === formData.namaProgram)
      setSelectedProgram(program || null)
    }
  }, [formData.namaProgram, programs])

  const tdpMinimumRupiah =
    selectedProgram && formData.otr > 0 ? Math.round((selectedProgram.tdpPersen / 100) * formData.otr) : 0

  const calculateSimulasi = () => {
    if (!selectedProgram || formData.otr === 0) return

    const results: any[] = []
    const tenorBungaList = Array.isArray(selectedProgram.tenorBunga) ? selectedProgram.tenorBunga : []

    const isBelowMin = formData.mode === "tdp" && formData.tdp < tdpMinimumRupiah
    setTdpBelowMinimum(isBelowMin)

    if (isBelowMin) {
      setHasilSimulasi([])
      toast({
        title: "TDP Di Bawah Minimum",
        description: `TDP minimum untuk program ini adalah ${formatRupiah(tdpMinimumRupiah)}. Silakan masukkan TDP yang sesuai.`,
        variant: "destructive",
      })
      return
    }

    tenorBungaList
      .filter((tb) => tb.isActive !== false)
      .forEach((tb) => {
        let tdpAmount: number
        let angsuranAmount: number

        if (formData.mode === "tdp") {
          tdpAmount = formData.tdp || 0
          const pokokPinjaman = formData.otr - tdpAmount
          const bungaPerBulan = tb.bunga / 100 / 12
          angsuranAmount =
            (pokokPinjaman * (bungaPerBulan * Math.pow(1 + bungaPerBulan, tb.tenor))) /
            (Math.pow(1 + bungaPerBulan, tb.tenor) - 1)
        } else {
          angsuranAmount = formData.angsuran
          const bungaPerBulan = tb.bunga / 100 / 12
          const pokokPinjaman =
            (angsuranAmount * (Math.pow(1 + bungaPerBulan, tb.tenor) - 1)) /
            (bungaPerBulan * Math.pow(1 + bungaPerBulan, tb.tenor))
          tdpAmount = formData.otr - pokokPinjaman
        }

        results.push({
          tenor: tb.tenor,
          tdp: Math.round(tdpAmount),
          angsuran: Math.round(angsuranAmount),
        })
      })

    results.sort((a, b) => a.tenor - b.tenor)
    setHasilSimulasi(results)
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const handleSimpan = async () => {
    if (!user || hasilSimulasi.length === 0) return

    if (isSaving) return
    setIsSaving(true)

    try {
      const simulasiData: Omit<SimulasiKredit, "id" | "createdAt"> = {
        userId: user.id,
        userName: user.namaLengkap,
        merk: formData.merk,
        dealer: formData.dealer,
        jenisPembiayaan: formData.jenisPembiayaan,
        namaProgram: formData.namaProgram,
        otr: formData.otr,
        tdp: formData.tdp,
        mode: formData.mode,
        cmoId: formData.cmoId || undefined,
        hasilSimulasi: hasilSimulasi,
      }

      await simulasiStore.add(simulasiData)

      toast({
        title: "Berhasil",
        description: "Simulasi berhasil disimpan",
      })

      const history = await simulasiStore.getByUserId(user.id)
      setRiwayatSimulasi(Array.isArray(history) ? history : [])
    } catch (error) {
      console.error("Error saving simulasi:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menyimpan simulasi",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!user || hasilSimulasi.length === 0) return

    const cmo = formData.cmoId ? cmoList.find((c) => c.id === formData.cmoId) : null
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Simulasi Kredit - ${user.namaLengkap}</title>
        <style>
          @page { margin: 20mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0891b2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #0891b2;
            margin: 0;
            font-size: 24px;
          }
          .header p {
            color: #666;
            margin: 5px 0 0 0;
          }
          .info-section {
            margin-bottom: 30px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .info-item {
            padding: 10px;
            background: #f8fafc;
            border-radius: 8px;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }
          .info-value {
            font-weight: 600;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #0891b2;
            color: white;
            font-weight: 600;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          tr.highlight {
            background: #e0f2fe;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HASIL SIMULASI KREDIT</h1>
          <p>Tanggal: ${currentDate}</p>
        </div>
        
        <div class="info-section">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nama ${user.role === "spv" ? "SPV" : "Sales"}</div>
              <div class="info-value">${user.namaLengkap}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Dealer</div>
              <div class="info-value">${formData.dealer}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Merk</div>
              <div class="info-value">${formData.merk}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Jenis Pembiayaan</div>
              <div class="info-value">${formData.jenisPembiayaan}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Program</div>
              <div class="info-value">${formData.namaProgram}</div>
            </div>
            <div class="info-item">
              <div class="info-label">OTR</div>
              <div class="info-value">${formatRupiah(formData.otr)}</div>
            </div>
            ${
              cmo
                ? `
            <div class="info-item">
              <div class="info-label">CMO</div>
              <div class="info-value">${cmo.namaLengkap}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>TENOR</th>
              <th>TDP</th>
              <th>ANGSURAN/BULAN</th>
              <th>OTR</th>
            </tr>
          </thead>
          <tbody>
            ${hasilSimulasi
              .map(
                (result, index) => `
              <tr class="${index === 0 ? "highlight" : ""}">
                <td>${result.tenor} Bulan</td>
                <td>${formatRupiah(result.tdp)}</td>
                <td>${formatRupiah(result.angsuran)}</td>
                <td>${formatRupiah(formData.otr)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>Dokumen ini dihasilkan secara otomatis oleh Sistem Simulasi Kredit</p>
          <p>* Simulasi ini bersifat estimasi dan dapat berubah sewaktu-waktu</p>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)

    const printWindow = window.open(url, "_blank")
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  useEffect(() => {
    const loadRiwayat = async () => {
      if (user && activeTab === "riwayat") {
        const history = await simulasiStore.getByUserId(user.id)
        setRiwayatSimulasi(Array.isArray(history) ? history : [])
      }
    }
    loadRiwayat()
  }, [user, activeTab])

  useEffect(() => {
    if (isSalesOrSpv && user) {
      const salesMerk = Array.isArray(user.merk) ? user.merk[0] : user.merk
      setFormData((prev) => ({
        ...prev,
        merk: salesMerk || prev.merk,
        dealer: user.dealer || prev.dealer,
      }))
    }
  }, [user, isSalesOrSpv])

  if (!user) return null

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Simulasi Kredit" />

      <main className="flex-1 p-4 md:p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="simulasi" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Simulasi
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Riwayat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulasi" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Simulasi</CardTitle>
                <CardDescription>Masukkan data untuk menghitung simulasi kredit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Merk</Label>
                    {isSalesOrSpv ? (
                      <Input value={formData.merk} readOnly className="bg-muted" />
                    ) : (
                      <Select
                        value={formData.merk}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, merk: value, dealer: "" }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Merk" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMerks.map((merk) => (
                            <SelectItem key={merk} value={merk}>
                              {merk}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Dealer</Label>
                    {isSalesOrSpv ? (
                      <Input value={formData.dealer} readOnly className="bg-muted" />
                    ) : (
                      <Select
                        value={formData.dealer}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, dealer: value }))}
                        disabled={!formData.merk}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Dealer" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDealers.map((dealer) => (
                            <SelectItem key={dealer} value={dealer}>
                              {dealer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Jenis Pembiayaan</Label>
                    <Select
                      value={formData.jenisPembiayaan}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          jenisPembiayaan: value as
                            | "Passenger"
                            | "Pick Up"
                            | "Pass Comm"
                            | "Truck"
                            | "EV (Listrik)"
                            | "",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Passenger">Passenger</SelectItem>
                        <SelectItem value="Pick Up">Pick Up</SelectItem>
                        <SelectItem value="Pass Comm">Pass Comm</SelectItem>
                        <SelectItem value="Truck">Truck</SelectItem>
                        <SelectItem value="EV (Listrik)">EV (Listrik)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nama Program</Label>
                    <Select
                      value={formData.namaProgram}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, namaProgram: value }))}
                      disabled={filteredPrograms.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={filteredPrograms.length === 0 ? "Pilih Merk & Jenis dulu" : "Pilih Program"}
                        />
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

                  <div className="space-y-2">
                    <Label>OTR (On The Road)</Label>
                    <Input
                      type="number"
                      value={formData.otr || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, otr: Number(e.target.value) }))}
                      placeholder="Masukkan harga OTR"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mode Simulasi</Label>
                    <Select
                      value={formData.mode}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, mode: value as "tdp" | "angsuran" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tdp">Berdasarkan TDP</SelectItem>
                        <SelectItem value="angsuran">Berdasarkan Angsuran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.mode === "tdp" ? (
                    <div className="space-y-2">
                      <Label>TDP (Tanda Jadi Pembayaran)</Label>
                      <Input
                        type="number"
                        value={formData.tdp || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, tdp: Number(e.target.value) }))}
                        placeholder="Masukkan jumlah TDP"
                      />
                      {selectedProgram && formData.otr > 0 && (
                        <p
                          className={`text-sm ${formData.tdp > 0 && formData.tdp < tdpMinimumRupiah ? "text-destructive font-medium" : "text-muted-foreground"}`}
                        >
                          Saran TDP Minimum: <span className="font-semibold">{formatRupiah(tdpMinimumRupiah)}</span>
                          {formData.tdp > 0 && formData.tdp < tdpMinimumRupiah && (
                            <span className="block text-destructive">
                              TDP di bawah minimum! Hasil simulasi tidak akan ditampilkan.
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Angsuran yang Diinginkan</Label>
                      <Input
                        type="number"
                        value={formData.angsuran || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, angsuran: Number(e.target.value) }))}
                        placeholder="Masukkan jumlah angsuran"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>CMO (Opsional)</Label>
                    <Select
                      value={formData.cmoId || ""}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, cmoId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih CMO" />
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
                </div>

                {selectedProgram && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Info Program: {selectedProgram.namaProgram}</h4>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tenor Tersedia</span>
                        <span className="font-medium">
                          {(selectedProgram.tenorBunga || [])
                            .filter((tb) => tb.isActive !== false)
                            .sort((a, b) => a.tenor - b.tenor)
                            .map((tb) => `${tb.tenor} bln`)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={calculateSimulasi}
                  className="w-full"
                  disabled={!selectedProgram || formData.otr === 0}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Hitung Simulasi
                </Button>
              </CardContent>
            </Card>

            {hasilSimulasi.length > 0 && (
              <Card ref={resultRef}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                    <span>Hasil Simulasi</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                        <FileText className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button variant="default" size="sm" onClick={handleSimpan} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {isSaving ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="px-4 py-3 text-left font-semibold">Tenor</th>
                            <th className="px-4 py-3 text-right font-semibold">TDP</th>
                            <th className="px-4 py-3 text-right font-semibold">Angsuran/Bulan</th>
                            <th className="px-4 py-3 text-right font-semibold">OTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hasilSimulasi.map((result, index) => (
                            <tr
                              key={index}
                              className={`border-b last:border-0 ${index % 2 === 0 ? "bg-background" : "bg-muted/30"} hover:bg-muted/50 transition-colors`}
                            >
                              <td className="px-4 py-3 font-medium">{result.tenor} Bulan</td>
                              <td className="px-4 py-3 text-right font-mono">{formatRupiah(result.tdp)}</td>
                              <td className="px-4 py-3 text-right font-mono text-primary font-semibold">
                                {formatRupiah(result.angsuran)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">{formatRupiah(formData.otr)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    * Simulasi ini bersifat estimasi dan dapat berubah sewaktu-waktu
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="riwayat" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Simulasi</CardTitle>
                <CardDescription>Daftar simulasi yang pernah Anda simpan</CardDescription>
              </CardHeader>
              <CardContent>
                {riwayatSimulasi.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada riwayat simulasi</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {riwayatSimulasi.map((simulasi) => (
                      <div key={simulasi.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{simulasi.merk}</Badge>
                            <span className="text-sm font-medium">{simulasi.namaProgram}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatTanggal(simulasi.createdAt)}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">OTR:</span>{" "}
                            <span className="font-medium">{formatRupiah(simulasi.otr)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">TDP:</span>{" "}
                            <span className="font-medium">{formatRupiah(simulasi.tdp)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Dealer:</span>{" "}
                            <span className="font-medium">{simulasi.dealer}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Jenis:</span>{" "}
                            <span className="font-medium">{simulasi.jenisPembiayaan}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
