"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { OrderTimeline } from "@/components/dashboard/order-timeline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth-context"
import { orderStore, generateId } from "@/lib/data-store"
import type { Order, OrderStatus, OrderChecklist } from "@/lib/types"
import { formatRupiah, formatTanggalWaktu } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { notifySlikOrDecision } from "@/app/actions/notification-actions"

const ITEMS_PER_PAGE = 5

const STATUS_LIST: OrderStatus[] = [
  "Baru",
  "Claim",
  "Cek Slik",
  "Proses",
  "Pertimbangkan",
  "Map In",
  "Approve",
  "Reject",
]

const getStatusTimestamps = (notes: Order["notes"]) => {
  const timestamps: Partial<Record<OrderStatus, string>> = {}
  if (!notes || !Array.isArray(notes)) return timestamps

  for (const note of notes) {
    if (note.status && !timestamps[note.status]) {
      timestamps[note.status] = note.createdAt
    }
  }
  return timestamps
}

const getPassedStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
  const statusFlow: OrderStatus[] = ["Baru", "Claim", "Cek Slik", "Proses", "Pertimbangkan", "Map In", "Approve"]
  const currentIndex = statusFlow.indexOf(currentStatus)

  // If Reject, return special flow
  if (currentStatus === "Reject") {
    return ["Baru", "Claim", "Cek Slik", "Proses", "Reject"]
  }

  // If Pertimbangkan, show up to Pertimbangkan
  if (currentStatus === "Pertimbangkan") {
    return ["Baru", "Claim", "Cek Slik", "Proses", "Pertimbangkan"]
  }

  if (currentIndex === -1) return ["Baru"]
  return statusFlow.slice(0, currentIndex + 1)
}

export default function TrackingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showBandingDialog, setShowBandingDialog] = useState(false)
  const [showProcessDialog, setShowProcessDialog] = useState(false)
  const [showCmhDialog, setShowCmhDialog] = useState(false)
  const [showSurveyDialog, setShowSurveyDialog] = useState(false)
  const [showMapInDecisionDialog, setShowMapInDecisionDialog] = useState(false)
  const [mapInDecisionNote, setMapInDecisionNote] = useState("")
  const [bandingNote, setBandingNote] = useState("")
  const [cmhNote, setCmhNote] = useState("")
  const [hasilSlik, setHasilSlik] = useState("")
  const [tanggalSurvey, setTanggalSurvey] = useState("")
  const [checklist, setChecklist] = useState<OrderChecklist>({
    ktpPemohon: false,
    ktpPasangan: false,
    kartuKeluarga: false,
    npwp: false,
    bkr: false,
    livin: false,
    rekTabungan: false,
    mufApp: false,
  })
  const [fotoSurvey, setFotoSurvey] = useState<string[]>([])
  const [isUploadingFoto, setIsUploadingFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadOrders()
  }, [user])

  const loadOrders = async () => {
    if (user) {
      setLoading(true)
      try {
        if (user.role === "sales") {
          const salesOrders = await orderStore.getBySalesId(user.id)
          setOrders(Array.isArray(salesOrders) ? salesOrders : [])
        } else if (user.role === "cmo") {
          const allOrders = await orderStore.getAll()
          const ordersArray = Array.isArray(allOrders) ? allOrders : []
          const filteredByCmo = ordersArray.filter((o) => {
            // Match by ID
            if (o.cmoId === user.id) return true
            // Match by username (some orders may store username as cmoId)
            if (o.cmoId === user.username) return true
            // Match by name
            if (o.cmoName && o.cmoName.toUpperCase() === user.namaLengkap.toUpperCase()) return true
            return false
          })
          setOrders(filteredByCmo)
        } else {
          const allOrders = await orderStore.getAll()
          setOrders(Array.isArray(allOrders) ? allOrders : [])
        }
      } catch (error) {
        console.error("Error loading orders:", error)
        setOrders([])
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...orders]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (o) =>
          o.namaNasabah.toLowerCase().includes(query) ||
          o.typeUnit.toLowerCase().includes(query) ||
          o.merk.toLowerCase().includes(query) ||
          o.salesName.toLowerCase().includes(query),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter)
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }, [orders, searchQuery, statusFilter])

  const totalOrders = filteredOrders.length
  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const getStatusBadge = (status: OrderStatus) => {
    const styles: Record<OrderStatus, string> = {
      Baru: "bg-blue-100 text-blue-700",
      Claim: "bg-amber-100 text-amber-700",
      "Cek Slik": "bg-orange-100 text-orange-700",
      Proses: "bg-cyan-100 text-cyan-700",
      Pertimbangkan: "bg-purple-100 text-purple-700",
      "Map In": "bg-teal-100 text-teal-700",
      Approve: "bg-green-100 text-green-700",
      Reject: "bg-red-100 text-red-700",
    }
    return <Badge className={cn("font-medium", styles[status])}>{status}</Badge>
  }

  const addNote = async (order: Order, note: string, newStatus: OrderStatus) => {
    if (!user) return

    const newNote = {
      id: generateId(),
      userId: user.id,
      userName: user.namaLengkap,
      role: user.role,
      note,
      status: newStatus,
      createdAt: new Date().toISOString(),
    }

    await orderStore.addNote(order.id, newNote)
    await orderStore.update(order.id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })

    await loadOrders()
  }

  const handleClaim = async (order: Order) => {
    if (!user) return
    try {
      await orderStore.update(order.id, {
        claimedBy: user.id,
        claimedAt: new Date().toISOString(),
        status: "Claim",
        updatedAt: new Date().toISOString(),
      })
      await addNote(order, `Order di-claim oleh ${user.namaLengkap}`, "Claim")
      toast({ title: "Berhasil", description: "Order berhasil di-claim" })
    } catch (error) {
      console.error("Error claiming order:", error)
      toast({ title: "Error", description: "Gagal meng-claim order", variant: "destructive" })
    }
  }

  const handleProcess = (order: Order) => {
    setSelectedOrder(order)
    setHasilSlik("")
    setShowProcessDialog(true)
  }

  const handleSubmitSlik = async () => {
    if (!selectedOrder || !hasilSlik) return
    try {
      await orderStore.update(selectedOrder.id, {
        hasilSlik,
        status: "Cek Slik",
        updatedAt: new Date().toISOString(),
      })
      await addNote(selectedOrder, `Hasil SLIK: ${hasilSlik}`, "Cek Slik")

      // Notify Sales
      try {
        await notifySlikOrDecision({
          orderId: selectedOrder.id,
          namaNasabah: selectedOrder.namaNasabah,
          salesId: selectedOrder.salesId,
          type: "slik",
          result: hasilSlik,
        })
      } catch (notifError) {
        console.error("Notification error:", notifError)
      }

      setShowProcessDialog(false)
      toast({ title: "Berhasil", description: "Hasil SLIK berhasil disimpan" })
    } catch (error) {
      console.error("Error submitting SLIK:", error)
      toast({ title: "Error", description: "Gagal menyimpan hasil SLIK", variant: "destructive" })
    }
  }

  const handleSurvey = (order: Order) => {
    setSelectedOrder(order)
    setTanggalSurvey("")
    setChecklist({
      ktpPemohon: order.checklist?.ktpPemohon || false,
      ktpPasangan: order.checklist?.ktpPasangan || false,
      kartuKeluarga: order.checklist?.kartuKeluarga || false,
      npwp: order.checklist?.npwp || false,
      bkr: order.checklist?.bkr || false,
      livin: order.checklist?.livin || false,
      rekTabungan: order.checklist?.rekTabungan || false,
      mufApp: order.checklist?.mufApp || false,
    })
    setFotoSurvey(order.fotoSurvey || [])
    setShowSurveyDialog(true)
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingFoto(true)
    try {
      const newPhotos: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        newPhotos.push(base64)
      }
      setFotoSurvey((prev) => [...prev, ...newPhotos])
    } catch (error) {
      console.error("Error uploading photos:", error)
      toast({ title: "Error", description: "Gagal mengupload foto", variant: "destructive" })
    } finally {
      setIsUploadingFoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSubmitSurvey = async () => {
    if (!selectedOrder || !tanggalSurvey) return
    try {
      await orderStore.update(selectedOrder.id, {
        tanggalSurvey,
        checklist,
        fotoSurvey,
        status: "Proses",
        updatedAt: new Date().toISOString(),
      })
      await addNote(selectedOrder, `Survey dijadwalkan: ${tanggalSurvey}`, "Proses")
      setShowSurveyDialog(false)
      toast({ title: "Berhasil", description: "Data survey berhasil disimpan" })
    } catch (error) {
      console.error("Error submitting survey:", error)
      toast({ title: "Error", description: "Gagal menyimpan data survey", variant: "destructive" })
    }
  }

  const handleCmhDecision = (order: Order) => {
    setSelectedOrder(order)
    setCmhNote("")
    setShowCmhDialog(true)
  }

  const handleSubmitCmhDecision = async (decision: "Approve" | "Reject" | "Pertimbangkan") => {
    if (!selectedOrder) return
    try {
      const newStatus = decision
      await orderStore.update(selectedOrder.id, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      await addNote(selectedOrder, `Keputusan CMH: ${decision}. ${cmhNote}`, newStatus)

      // Notify Sales about decision
      try {
        await notifySlikOrDecision({
          orderId: selectedOrder.id,
          namaNasabah: selectedOrder.namaNasabah,
          salesId: selectedOrder.salesId,
          type: "decision",
          result: decision,
        })
      } catch (notifError) {
        console.error("Notification error:", notifError)
      }

      setShowCmhDialog(false)
      toast({ title: "Berhasil", description: `Order berhasil di-${decision.toLowerCase()}` })
    } catch (error) {
      console.error("Error submitting CMH decision:", error)
      toast({ title: "Error", description: "Gagal menyimpan keputusan", variant: "destructive" })
    }
  }

  const handleMapInDecision = (order: Order) => {
    setSelectedOrder(order)
    setMapInDecisionNote("")
    setShowMapInDecisionDialog(true)
  }

  const handleSubmitMapIn = async () => {
    if (!selectedOrder) return
    try {
      await orderStore.update(selectedOrder.id, {
        status: "Map In",
        updatedAt: new Date().toISOString(),
      })
      await addNote(selectedOrder, `Order masuk Map In. ${mapInDecisionNote}`, "Map In")
      setShowMapInDecisionDialog(false)
      toast({ title: "Berhasil", description: "Order berhasil masuk Map In" })
    } catch (error) {
      console.error("Error submitting Map In:", error)
      toast({ title: "Error", description: "Gagal update status", variant: "destructive" })
    }
  }

  const handleSubmitBanding = async () => {
    if (!selectedOrder || !bandingNote) return
    try {
      await orderStore.update(selectedOrder.id, {
        status: "Pertimbangkan",
        updatedAt: new Date().toISOString(),
      })
      await addNote(selectedOrder, `Banding diajukan: ${bandingNote}`, "Pertimbangkan")
      setShowBandingDialog(false)
      toast({ title: "Berhasil", description: "Banding berhasil diajukan" })
    } catch (error) {
      console.error("Error submitting banding:", error)
      toast({ title: "Error", description: "Gagal mengajukan banding", variant: "destructive" })
    }
  }

  const getStatusCount = (status: OrderStatus) => orders.filter((o) => o.status === status).length

  const canClaim = (order: Order) => user?.role === "cmo" && order.status === "Baru" && !order.claimedBy
  const canProcess = (order: Order) => user?.role === "cmo" && order.status === "Claim" && order.claimedBy === user?.id
  const canSurvey = (order: Order) =>
    user?.role === "cmo" && order.status === "Cek Slik" && order.claimedBy === user?.id
  const canMapIn = (order: Order) => user?.role === "cmo" && order.status === "Proses" && order.claimedBy === user?.id
  const canCmhDecide = (order: Order) => user?.role === "cmh" && order.status === "Map In"
  const canBanding = (order: Order) => user?.role === "sales" && order.status === "Reject"

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailDialog(true)
  }

  const handleBanding = (order: Order) => {
    setSelectedOrder(order)
    setBandingNote("")
    setShowBandingDialog(true)
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader
          title="Tracking Order"
          description={user.role === "sales" ? "Lacak status order Anda" : "Kelola dan proses semua order"}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Tracking Order"
        description={user.role === "sales" ? "Lacak status order Anda" : "Kelola dan proses semua order"}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
        {/* Status Summary */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {STATUS_LIST.map((status) => (
            <div key={status} className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
              <p className="text-lg md:text-xl font-bold">{getStatusCount(status)}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{status}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nasabah, sales, unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {STATUS_LIST.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Order</CardTitle>
            <CardDescription>
              {totalOrders > 0
                ? `Menampilkan ${startIndex + 1} - ${Math.min(endIndex, totalOrders)} dari ${totalOrders} order`
                : `${totalOrders} order ditemukan`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada order ditemukan</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nasabah</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>CMO</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.namaNasabah}</TableCell>
                          <TableCell>
                            {order.merk} - {order.typeUnit}
                          </TableCell>
                          <TableCell>{order.salesName}</TableCell>
                          <TableCell>{order.cmoName || "-"}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{formatTanggalWaktu(order.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewDetail(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canClaim(order) && (
                                <Button variant="outline" size="sm" onClick={() => handleClaim(order)}>
                                  Claim
                                </Button>
                              )}
                              {canProcess(order) && (
                                <Button variant="outline" size="sm" onClick={() => handleProcess(order)}>
                                  Cek SLIK
                                </Button>
                              )}
                              {canSurvey(order) && (
                                <Button variant="outline" size="sm" onClick={() => handleSurvey(order)}>
                                  Survey
                                </Button>
                              )}
                              {canMapIn(order) && (
                                <Button variant="outline" size="sm" onClick={() => handleMapInDecision(order)}>
                                  Map In
                                </Button>
                              )}
                              {canCmhDecide(order) && (
                                <Button variant="outline" size="sm" onClick={() => handleCmhDecision(order)}>
                                  Keputusan
                                </Button>
                              )}
                              {canBanding(order) && (
                                <Button variant="outline" size="sm" onClick={() => handleBanding(order)}>
                                  Banding
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Order</DialogTitle>
            <DialogDescription>Informasi lengkap order</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nama Nasabah</Label>
                  <p className="font-medium">{selectedOrder.namaNasabah}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">No HP</Label>
                  <p className="font-medium">{selectedOrder.noHp}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Unit</Label>
                  <p className="font-medium">
                    {selectedOrder.merk} - {selectedOrder.typeUnit}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">OTR</Label>
                  <p className="font-medium">{formatRupiah(selectedOrder.otr)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">TDP</Label>
                  <p className="font-medium">{formatRupiah(selectedOrder.tdp)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Angsuran</Label>
                  <p className="font-medium">{formatRupiah(selectedOrder.angsuran)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tenor</Label>
                  <p className="font-medium">{selectedOrder.tenor} bulan</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              {selectedOrder.hasilSlik && (
                <div>
                  <Label className="text-muted-foreground">Hasil SLIK</Label>
                  <p className="font-medium">{selectedOrder.hasilSlik}</p>
                </div>
              )}

              {selectedOrder.tanggalSurvey && (
                <div>
                  <Label className="text-muted-foreground">Tanggal Survey</Label>
                  <p className="font-medium">{selectedOrder.tanggalSurvey}</p>
                </div>
              )}

              <OrderTimeline
                currentStatus={selectedOrder.status}
                passedStatuses={getPassedStatuses(selectedOrder.status)}
                timestamps={getStatusTimestamps(selectedOrder.notes)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog (SLIK) */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Hasil SLIK</DialogTitle>
            <DialogDescription>Masukkan hasil pengecekan SLIK</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hasil SLIK</Label>
              <Select value={hasilSlik} onValueChange={setHasilSlik}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih hasil SLIK" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clear">Clear</SelectItem>
                  <SelectItem value="Ada Catatan">Ada Catatan</SelectItem>
                  <SelectItem value="Tolak">Tolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmitSlik} disabled={!hasilSlik}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Survey Dialog */}
      <Dialog open={showSurveyDialog} onOpenChange={setShowSurveyDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Data Survey</DialogTitle>
            <DialogDescription>Isi data survey dan checklist dokumen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tanggal Survey</Label>
              <Input type="date" value={tanggalSurvey} onChange={(e) => setTanggalSurvey(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Checklist Dokumen</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(checklist).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, [key]: checked as boolean }))}
                    />
                    <Label htmlFor={key} className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto Survey</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleUploadFoto}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFoto}
                className="w-full"
              >
                {isUploadingFoto ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Foto
              </Button>
              {fotoSurvey.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {fotoSurvey.map((foto, idx) => (
                    <img
                      key={idx}
                      src={foto || "/placeholder.svg"}
                      alt={`Survey ${idx + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSurveyDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmitSurvey} disabled={!tanggalSurvey}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map In Decision Dialog */}
      <Dialog open={showMapInDecisionDialog} onOpenChange={setShowMapInDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map In Order</DialogTitle>
            <DialogDescription>Kirim order ke CMH untuk keputusan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Catatan (Opsional)</Label>
              <Textarea
                value={mapInDecisionNote}
                onChange={(e) => setMapInDecisionNote(e.target.value)}
                placeholder="Tambahkan catatan..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMapInDecisionDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmitMapIn}>Kirim ke CMH</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CMH Decision Dialog */}
      <Dialog open={showCmhDialog} onOpenChange={setShowCmhDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keputusan CMH</DialogTitle>
            <DialogDescription>Berikan keputusan untuk order ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={cmhNote}
                onChange={(e) => setCmhNote(e.target.value)}
                placeholder="Tambahkan catatan keputusan..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCmhDialog(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={() => handleSubmitCmhDecision("Reject")}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button variant="secondary" onClick={() => handleSubmitCmhDecision("Pertimbangkan")}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Pertimbangkan
              </Button>
              <Button onClick={() => handleSubmitCmhDecision("Approve")}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Banding Dialog */}
      <Dialog open={showBandingDialog} onOpenChange={setShowBandingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Banding</DialogTitle>
            <DialogDescription>Ajukan banding untuk order yang ditolak</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Alasan Banding</Label>
              <Textarea
                value={bandingNote}
                onChange={(e) => setBandingNote(e.target.value)}
                placeholder="Jelaskan alasan banding..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBandingDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmitBanding} disabled={!bandingNote}>
                Ajukan Banding
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
