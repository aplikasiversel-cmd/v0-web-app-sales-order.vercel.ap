"use client"
import { useState, useEffect } from "react"
import { Download, FileSpreadsheet, Calendar, Loader2, FileText } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { orderStore, aktivitasStore } from "@/lib/data-store"
import type { Order, Aktivitas } from "@/lib/types"
import { formatRupiah, formatTanggal } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
]

export default function LaporanPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true)
      try {
        const [ordersData, aktivitasData] = await Promise.all([orderStore.getAll(), aktivitasStore.getAll()])
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setAktivitas(Array.isArray(aktivitasData) ? aktivitasData : [])
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setDataLoading(false)
      }
    }
    loadData()
  }, [])

  const filterByMonth = <T extends { createdAt?: string; tanggal?: string }>(
    data: T[],
    month: string,
    year: string,
  ): T[] => {
    if (!month || !year) return []
    return data.filter((item) => {
      const dateStr = item.createdAt || item.tanggal || ""
      if (!dateStr) return false
      const date = new Date(dateStr)
      const itemMonth = String(date.getMonth() + 1).padStart(2, "0")
      const itemYear = String(date.getFullYear())
      return itemMonth === month && itemYear === year
    })
  }

  const filteredOrders = filterByMonth(orders, selectedMonth, selectedYear)
  const filteredAktivitas = filterByMonth(aktivitas, selectedMonth, selectedYear)

  const downloadCSV = (data: Record<string, string>[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data untuk bulan dan tahun yang dipilih",
        variant: "destructive",
      })
      return
    }

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] || ""
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)

    toast({
      title: "Download Berhasil",
      description: `File ${filename} berhasil diunduh`,
    })
  }

  const handleDownloadOrders = () => {
    setLoading(true)
    try {
      const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth
      const csvData = filteredOrders.map((order) => ({
        "Tanggal Order": formatTanggal(order.createdAt),
        "Nama Nasabah": order.namaNasabah || "",
        "No HP": order.noHp || "",
        NIK: order.nik || "",
        Alamat: order.alamat || "",
        Merk: order.merk || "",
        Dealer: order.dealer || "",
        "Type Unit": order.typeUnit || "",
        Warna: order.warna || "",
        Tahun: order.tahun || "",
        OTR: formatRupiah(order.otr),
        TDP: formatRupiah(order.tdp),
        Tenor: `${order.tenor} bulan`,
        Angsuran: formatRupiah(order.angsuran),
        Status: order.status || "",
        Sales: order.salesName || "",
        CMO: order.cmoName || "-",
        "Hasil SLIK": order.hasilSlik || "-",
        "Tanggal Survey": order.tanggalSurvey ? formatTanggal(order.tanggalSurvey) : "-",
      }))

      downloadCSV(csvData, `Laporan_Order_${monthLabel}_${selectedYear}.csv`)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadAktivitas = () => {
    setLoading(true)
    try {
      const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth
      const csvData = filteredAktivitas.map((akt) => ({
        "Tanggal Aktivitas": formatTanggal(akt.tanggal),
        "Jenis Aktivitas": akt.jenisAktivitas || "",
        Dealer: akt.dealer || "",
        "PIC Dealer": akt.picDealer || "",
        "Dicatat Oleh": akt.userName || "",
        Role: (akt.role || "").toUpperCase(),
        "Jumlah Foto": String(akt.fotoAktivitas?.length || 0),
        "Tanggal Dicatat": formatTanggal(akt.createdAt),
      }))

      downloadCSV(csvData, `Laporan_Aktivitas_${monthLabel}_${selectedYear}.csv`)
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== "cmh") {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Laporan Bulanan" description="Download laporan order dan aktivitas" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Halaman ini hanya untuk CMH</p>
        </div>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Laporan Bulanan" description="Download laporan order dan aktivitas" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Laporan Bulanan" description="Download laporan order dan aktivitas" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Pilih Periode
            </CardTitle>
            <CardDescription>Pilih bulan dan tahun untuk mengunduh laporan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label>Bulan</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Tahun</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Laporan Order
              </CardTitle>
              <CardDescription>Download data semua order dalam format CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Order</span>
                  <span className="font-bold text-lg">{filteredOrders.length}</span>
                </div>
                {selectedMonth && selectedYear && (
                  <p className="text-xs text-muted-foreground">
                    Periode: {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Data yang termasuk:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>- Informasi nasabah (nama, no HP, NIK, alamat)</li>
                  <li>- Detail kendaraan (merk, dealer, type, warna, tahun)</li>
                  <li>- Informasi kredit (OTR, TDP, tenor, angsuran)</li>
                  <li>- Status order dan hasil SLIK</li>
                  <li>- Nama sales dan CMO</li>
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={handleDownloadOrders}
                disabled={!selectedMonth || !selectedYear || loading || filteredOrders.length === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Laporan Aktivitas
              </CardTitle>
              <CardDescription>Download data semua aktivitas dalam format CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Aktivitas</span>
                  <span className="font-bold text-lg">{filteredAktivitas.length}</span>
                </div>
                {selectedMonth && selectedYear && (
                  <p className="text-xs text-muted-foreground">
                    Periode: {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Data yang termasuk:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>- Jenis aktivitas (kunjungan, event, pameran)</li>
                  <li>- Informasi dealer dan PIC</li>
                  <li>- Nama dan role petugas</li>
                  <li>- Jumlah foto dokumentasi</li>
                  <li>- Tanggal aktivitas dan pencatatan</li>
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={handleDownloadAktivitas}
                disabled={!selectedMonth || !selectedYear || loading || filteredAktivitas.length === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        {selectedMonth && selectedYear && (
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Periode</CardTitle>
              <CardDescription>
                {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Total Order</p>
                  <p className="text-2xl font-bold text-blue-700">{filteredOrders.length}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Approved</p>
                  <p className="text-2xl font-bold text-green-700">
                    {filteredOrders.filter((o) => o.status === "Approve").length}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-700">
                    {filteredOrders.filter((o) => o.status === "Reject").length}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600">Total Aktivitas</p>
                  <p className="text-2xl font-bold text-amber-700">{filteredAktivitas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
