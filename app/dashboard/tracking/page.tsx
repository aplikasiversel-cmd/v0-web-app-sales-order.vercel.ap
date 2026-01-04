"use client"

import type React from "react"

import type { Order, User, OrderStatus, OrderChecklist, OrderNote } from "@/lib/types"
import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { orderStore, noteStore } from "@/lib/data-store"
import { formatRupiah, generateId } from "@/lib/utils"
import {
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react"
import { OrderTimeline } from "@/components/order-timeline"
import { notifySlikOrDecision } from "@/app/actions/notification-actions"
import Image from "next/image"

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

export default function TrackingPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showProcessDialog, setShowProcessDialog] = useState(false)
  const [showSurveyDialog, setShowSurveyDialog] = useState(false)
  const [showCmhDialog, setShowCmhDialog] = useState(false)
  const [showBandingDialog, setShowBandingDialog] = useState(false)
  const [showMapInDecisionDialog, setShowMapInDecisionDialog] = useState(false)
  const [showPertimbanganDialog, setShowPertimbanganDialog] = useState(false)
  const [pertimbanganNote, setPertimbanganNote] = useState("")
  const [mapInDecisionNote, setMapInDecisionNote] = useState("")
  const [bandingNote, setBandingNote] = useState("")
  const [cmhNote, setCmhNote] = useState("")
  const [hasilSlik, setHasilSlik] = useState("")
  const [slikNote, setSlikNote] = useState("")
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
  const ITEMS_PER_PAGE = 5

  useEffect(() => {
    loadOrders()
  }, [user])

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const loadOrders = async () => {
    if (!user) return
    try {
      setLoading(true)
      let ordersData: Order[] = []

      if (user.role === "admin") {
        ordersData = await orderStore.getAll()
      } else if (user.role === "cmh") {
        ordersData = await orderStore.getAll()
      } else if (user.role === "cmo") {
        const allOrders = await orderStore.getAll()
        ordersData = allOrders.filter(
          (o) =>
            o.cmoId === user.id ||
            o.cmoId === user.username ||
            o.cmoName === user.namaLengkap ||
            o.cmoName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
        )
      } else if (user.role === "sales") {
        ordersData = await orderStore.getBySalesId(user.id)
      } else if (user.role === "spv") {
        ordersData = await orderStore.getAll()
      }

      // Load notes for each order
      const ordersWithNotes = await Promise.all(
        ordersData.map(async (order) => {
          const notes = await noteStore.getByOrderId(order.id)
          return { ...order, notes: notes || [] }
        }),
      )

      setOrders(ordersWithNotes)
    } catch (error) {
      console.error("Error loading orders:", error)
      toast({ title: "Error", description: "Gagal memuat data order", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.namaNasabah.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.salesName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.typeUnit.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredOrders, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      Baru: 0,
      Claim: 0,
      "Cek Slik": 0,
      Proses: 0,
      Pertimbangkan: 0,
      "Map In": 0,
      Approve: 0,
      Reject: 0,
    }
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++
    })
    return counts
  }, [orders])

  const addNote = async (order: Order, note: string, newStatus: OrderStatus) => {
    if (!user) return

    const newNote: OrderNote = {
      id: generateId(),
      orderId: order.id,
      userId: user.id,
      userName: user.namaLengkap,
      role: user.role,
      note,
      status: newStatus,
      createdAt: new Date().toISOString(),
    }

    await noteStore.add(newNote)
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
    setSlikNote("")
    setShowProcessDialog(true)
  }

  const handleSubmitSlik = async () => {
    if (!selectedOrder || !hasilSlik) return
    try {
      const noteText = slikNote ? `Hasil SLIK: ${hasilSlik}. Catatan: ${slikNote}` : `Hasil SLIK: ${hasilSlik}`

      await orderStore.update(selectedOrder.id, {
        hasilSlik,
        status: "Cek Slik",
        updatedAt: new Date().toISOString(),
      })
      await addNote(selectedOrder, noteText, "Cek Slik")

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

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingFoto(true)
    try {
      const newPhotos: string[] = []
      for (const file of Array.from(files)) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        newPhotos.push(base64)
      }
      setFotoSurvey((prev) => [...prev, ...newPhotos])
    } catch (error) {
      console.error("Error uploading photos:", error)
      toast({ title: "Error", description: "Gagal upload foto", variant: "destructive" })
    } finally {
      setIsUploadingFoto(false)
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
      await addNote(selectedOrder, `Survey selesai pada ${tanggalSurvey}`, "Proses")
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
      const noteText = cmhNote ? `Keputusan CMH: ${decision}. Catatan: ${cmhNote}` : `Keputusan CMH: ${decision}`
      await addNote(selectedOrder, noteText, newStatus)

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

  const handlePertimbanganAction = (order: Order) => {
    setSelectedOrder(order)
    setPertimbanganNote("")
    setShowPertimbanganDialog(true)
  }

  const handleSubmitPertimbanganDecision = async (decision: "Approve" | "Reject") => {
    if (!selectedOrder) return
    try {
      await orderStore.update(selectedOrder.id, {
        status: decision,
        updatedAt: new Date().toISOString(),
      })
      const noteText = pertimbanganNote
        ? `Keputusan Pertimbangan CMH: ${decision}. Catatan: ${pertimbanganNote}`
        : `Keputusan Pertimbangan CMH: ${decision}`
      await addNote(selectedOrder, noteText, decision)

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

      setShowPertimbanganDialog(false)
      toast({ title: "Berhasil", description: `Order berhasil di-${decision.toLowerCase()}` })
    } catch (error) {
      console.error("Error submitting pertimbangan decision:", error)
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
      const noteText = mapInDecisionNote ? `Order masuk Map In. Catatan: ${mapInDecisionNote}` : `Order masuk Map In`
      await addNote(selectedOrder, noteText, "Map In")
      setShowMapInDecisionDialog(false)
      toast({ title: "Berhasil", description: "Order berhasil masuk Map In" })
    } catch (error) {
      console.error("Error submitting Map In:", error)
      toast({ title: "Error", description: "Gagal update status", variant: "destructive" })
    }
  }

  const handleBanding = (order: Order) => {
    setSelectedOrder(order)
    setBandingNote("")
    setShowBandingDialog(true)
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

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailDialog(true)
  }

  const getStatusBadge = (status: OrderStatus) => {
    const variants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
      Baru: "default",
      Claim: "secondary",
      "Cek Slik": "outline",
      Proses: "secondary",
      Pertimbangkan: "outline",
      "Map In": "secondary",
      Approve: "default",
      Reject: "destructive",
    }
    const colors: Record<OrderStatus, string> = {
      Baru: "bg-blue-100 text-blue-800",
      Claim: "bg-orange-100 text-orange-800",
      "Cek Slik": "bg-yellow-100 text-yellow-800",
      Proses: "bg-purple-100 text-purple-800",
      Pertimbangkan: "bg-amber-100 text-amber-800",
      "Map In": "bg-indigo-100 text-indigo-800",
      Approve: "bg-green-100 text-green-800",
      Reject: "bg-red-100 text-red-800",
    }
    return <Badge className={colors[status]}>{status}</Badge>
  }

  const getPassedStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
    const order: OrderStatus[] = ["Baru", "Claim", "Cek Slik", "Proses", "Map In", "Approve"]
    const idx = order.indexOf(currentStatus)
    if (idx === -1) {
      if (currentStatus === "Reject") return ["Baru", "Claim"]
      if (currentStatus === "Pertimbangkan") return ["Baru", "Claim", "Cek Slik", "Proses"]
      return []
    }
    return order.slice(0, idx + 1)
  }

  const getStatusTimestamps = (notes: OrderNote[] = []) => {
    const timestamps: Record<string, string> = {}
    notes.forEach((note) => {
      if (!timestamps[note.status]) {
        timestamps[note.status] = note.createdAt
      }
    })
    return timestamps
  }

  const canTakeAction = (order: Order) => {
    if (!user) return false
    if (user.role === "admin") return true
    if (user.role === "cmo") {
      return (
        ["Baru", "Claim", "Cek Slik", "Proses"].includes(order.status) &&
        (order.claimedBy === user.id || order.status === "Baru" || order.cmoId === user.id)
      )
    }
    if (user.role === "cmh") {
      return ["Map In", "Pertimbangkan"].includes(order.status)
    }
    if (user.role === "sales") {
      return order.status === "Reject"
    }
    return false
  }

  const renderActionButton = (order: Order) => {
    if (!canTakeAction(order)) return null

    if (user?.role === "cmo" || user?.role === "admin") {
      switch (order.status) {
        case "Baru":
          return (
            <Button size="sm" onClick={() => handleClaim(order)}>
              Claim
            </Button>
          )
        case "Claim":
          return (
            <Button size="sm" onClick={() => handleProcess(order)}>
              Cek SLIK
            </Button>
          )
        case "Cek Slik":
          return (
            <Button size="sm" onClick={() => handleSurvey(order)}>
              Survey
            </Button>
          )
        case "Proses":
          return (
            <Button size="sm" onClick={() => handleMapInDecision(order)}>
              Map In
            </Button>
          )
      }
    }

    if (user?.role === "cmh") {
      if (order.status === "Map In") {
        return (
          <Button size="sm" onClick={() => handleCmhDecision(order)}>
            Keputusan
          </Button>
        )
      }
      if (order.status === "Pertimbangkan") {
        return (
          <Button size="sm" onClick={() => handlePertimbanganAction(order)}>
            Tindak Lanjut
          </Button>
        )
      }
    }

    if (user?.role === "sales" && order.status === "Reject") {
      return (
        <Button size="sm" variant="outline" onClick={() => handleBanding(order)}>
          Banding
        </Button>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tracking Order</h1>
        <p className="text-muted-foreground">Kelola dan proses semua order</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {STATUS_LIST.map((status) => (
          <Card
            key={status}
            className={`cursor-pointer transition-all ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusCounts[status]}</p>
              <p className="text-xs text-muted-foreground truncate">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cari nasabah, sales, unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
              <SelectTrigger className="w-full md:w-[180px]">
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

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Order</CardTitle>
          <CardDescription>
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} dari {filteredOrders.length} order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Tidak ada order ditemukan</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nasabah</th>
                      <th className="text-left p-2">Sales</th>
                      <th className="text-left p-2">CMO</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Tanggal</th>
                      <th className="text-left p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{order.namaNasabah}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.merk} - {order.typeUnit}
                            </p>
                          </div>
                        </td>
                        <td className="p-2">{order.salesName}</td>
                        <td className="p-2">{order.cmoName || "-"}</td>
                        <td className="p-2">{getStatusBadge(order.status)}</td>
                        <td className="p-2 text-sm">
                          {new Date(order.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleViewDetail(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {renderActionButton(order)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Halaman {currentPage} dari {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

              {(user?.role === "cmo" || user?.role === "cmh" || user?.role === "admin") && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground font-semibold">Dokumen Lampiran</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {selectedOrder.fotoKtpNasabah && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">KTP Nasabah</p>
                        <a
                          href={selectedOrder.fotoKtpNasabah}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Image
                            src={selectedOrder.fotoKtpNasabah || "/placeholder.svg"}
                            alt="KTP Nasabah"
                            width={120}
                            height={80}
                            className="rounded border object-cover hover:opacity-80 cursor-pointer"
                          />
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs bg-transparent"
                          onClick={() => window.open(selectedOrder.fotoKtpNasabah, "_blank")}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                    {selectedOrder.fotoKtpPasangan && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">KTP Pasangan</p>
                        <a
                          href={selectedOrder.fotoKtpPasangan}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Image
                            src={selectedOrder.fotoKtpPasangan || "/placeholder.svg"}
                            alt="KTP Pasangan"
                            width={120}
                            height={80}
                            className="rounded border object-cover hover:opacity-80 cursor-pointer"
                          />
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs bg-transparent"
                          onClick={() => window.open(selectedOrder.fotoKtpPasangan, "_blank")}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                    {selectedOrder.fotoKk && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Kartu Keluarga</p>
                        <a href={selectedOrder.fotoKk} target="_blank" rel="noopener noreferrer" className="block">
                          <Image
                            src={selectedOrder.fotoKk || "/placeholder.svg"}
                            alt="Kartu Keluarga"
                            width={120}
                            height={80}
                            className="rounded border object-cover hover:opacity-80 cursor-pointer"
                          />
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs bg-transparent"
                          onClick={() => window.open(selectedOrder.fotoKk, "_blank")}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                    {selectedOrder.fotoSurvey && selectedOrder.fotoSurvey.length > 0 && (
                      <div className="col-span-3 space-y-1">
                        <p className="text-xs text-muted-foreground">Foto Survey</p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedOrder.fotoSurvey.map((foto, idx) => (
                            <div key={idx} className="space-y-1">
                              <a href={foto} target="_blank" rel="noopener noreferrer" className="block">
                                <Image
                                  src={foto || "/placeholder.svg"}
                                  alt={`Survey ${idx + 1}`}
                                  width={80}
                                  height={60}
                                  className="rounded border object-cover hover:opacity-80 cursor-pointer"
                                />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!selectedOrder.fotoKtpNasabah &&
                      !selectedOrder.fotoKtpPasangan &&
                      !selectedOrder.fotoKk &&
                      (!selectedOrder.fotoSurvey || selectedOrder.fotoSurvey.length === 0) && (
                        <p className="text-sm text-muted-foreground col-span-3">Tidak ada dokumen lampiran</p>
                      )}
                  </div>
                </div>
              )}

              {selectedOrder.notes && selectedOrder.notes.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground font-semibold">Catatan / Notes</Label>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {selectedOrder.notes.map((note, idx) => (
                      <div key={idx} className="bg-muted/50 p-2 rounded text-sm">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="font-medium">
                            {note.userName} ({note.role.toUpperCase()})
                          </span>
                          <span>{new Date(note.createdAt).toLocaleString("id-ID")}</span>
                        </div>
                        <p className="mt-1">{note.note}</p>
                      </div>
                    ))}
                  </div>
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

      {/* Process Dialog (SLIK) - Add Note field */}
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
            <div>
              <Label>Catatan (Opsional)</Label>
              <Textarea
                value={slikNote}
                onChange={(e) => setSlikNote(e.target.value)}
                placeholder="Tambahkan catatan hasil SLIK..."
              />
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
            <DialogDescription>Lengkapi data survey nasabah</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tanggal Survey</Label>
              <Input type="date" value={tanggalSurvey} onChange={(e) => setTanggalSurvey(e.target.value)} />
            </div>

            <div>
              <Label>Checklist Dokumen</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(checklist).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, [key]: checked === true }))}
                    />
                    <label htmlFor={key} className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Foto Survey</Label>
              <div className="mt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFotoUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFoto}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingFoto ? "Uploading..." : "Upload Foto"}
                </Button>
              </div>
              {fotoSurvey.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {fotoSurvey.map((foto, idx) => (
                    <div key={idx} className="relative">
                      <Image
                        src={foto || "/placeholder.svg"}
                        alt={`Survey ${idx + 1}`}
                        width={80}
                        height={80}
                        className="rounded border object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        onClick={() => setFotoSurvey((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ×
                      </button>
                    </div>
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

      <Dialog open={showPertimbanganDialog} onOpenChange={setShowPertimbanganDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tindak Lanjut Pertimbangan</DialogTitle>
            <DialogDescription>Berikan keputusan lanjutan untuk order yang dalam pertimbangan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={pertimbanganNote}
                onChange={(e) => setPertimbanganNote(e.target.value)}
                placeholder="Tambahkan catatan keputusan pertimbangan..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPertimbanganDialog(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={() => handleSubmitPertimbanganDecision("Reject")}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={() => handleSubmitPertimbanganDecision("Approve")}>
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
