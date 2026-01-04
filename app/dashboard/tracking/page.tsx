"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { orderStore, notificationStore } from "@/lib/data-store"
import type { Order, OrderStatus, User } from "@/lib/types"
import { formatRupiah } from "@/lib/utils"
import {
  Search,
  Filter,
  Eye,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Circle,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquare,
} from "lucide-react"

const ITEMS_PER_PAGE = 5

const STATUS_ORDER: OrderStatus[] = [
  "Baru",
  "Claim",
  "Cek Slik",
  "Proses",
  "Pertimbangkan",
  "Map In",
  "Approve",
  "Reject",
]

const STATUS_COLORS: Record<OrderStatus, string> = {
  Baru: "bg-blue-100 text-blue-800",
  Claim: "bg-orange-100 text-orange-800",
  "Cek Slik": "bg-yellow-100 text-yellow-800",
  Proses: "bg-purple-100 text-purple-800",
  Pertimbangkan: "bg-amber-100 text-amber-800",
  "Map In": "bg-indigo-100 text-indigo-800",
  Approve: "bg-green-100 text-green-800",
  Reject: "bg-red-100 text-red-800",
}

export default function TrackingOrderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showSlikDialog, setShowSlikDialog] = useState(false)
  const [showPertimbanganDialog, setShowPertimbanganDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [slikResult, setSlikResult] = useState<string>("")
  const [slikNote, setSlikNote] = useState("")
  const [pertimbanganAction, setPertimbanganAction] = useState<"Approve" | "Reject">("Approve")
  const [pertimbanganNote, setPertimbanganNote] = useState("")
  const [noteText, setNoteText] = useState("")
  const [processingAction, setProcessingAction] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("muf_current_user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      router.push("/login")
    }
  }, [router])

  const loadOrders = useCallback(async () => {
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

      // Orders already include notes from getOrders() in firebase-actions
      setOrders(ordersData)
    } catch (error) {
      console.error("Error loading orders:", error)
      toast({ title: "Error", description: "Gagal memuat data order", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    if (user) {
      loadOrders()
    }
  }, [user, loadOrders])

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

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

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
    orders.forEach((order) => {
      if (counts[order.status] !== undefined) {
        counts[order.status]++
      }
    })
    return counts
  }, [orders])

  const handleStatusCardClick = (status: OrderStatus | "all") => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailDialog(true)
  }

  const handleStatusChange = async (order: Order, newStatus: OrderStatus, note?: string) => {
    try {
      setProcessingAction(true)

      const updates: Partial<Order> = { status: newStatus }

      if (newStatus === "Claim" && user) {
        updates.claimedBy = user.id
        updates.claimedAt = new Date().toISOString()
      }

      await orderStore.update(order.id, updates)

      // Add note if provided
      if (note && user) {
        await orderStore.addNote(order.id, {
          id: crypto.randomUUID(),
          orderId: order.id,
          userId: user.id,
          userName: user.namaLengkap,
          role: user.role,
          note: note,
          status: newStatus,
          createdAt: new Date().toISOString(),
        })
      }

      // Create notification
      if (order.salesId) {
        await notificationStore.add({
          userId: order.salesId,
          title: `Status Order Diperbarui`,
          message: `Order ${order.namaNasabah} telah diperbarui ke status ${newStatus}`,
          type: "order_update",
          relatedOrderId: order.id,
        })
      }

      toast({ title: "Berhasil", description: `Status order diperbarui ke ${newStatus}` })
      await loadOrders()
    } catch (error) {
      console.error("Error updating status:", error)
      toast({ title: "Error", description: "Gagal memperbarui status", variant: "destructive" })
    } finally {
      setProcessingAction(false)
    }
  }

  const handleSlikSubmit = async () => {
    if (!selectedOrder || !slikResult) return

    try {
      setProcessingAction(true)

      let newStatus: OrderStatus = "Proses"
      if (slikResult === "Tolak") {
        newStatus = "Reject"
      } else if (slikResult === "Ada Catatan") {
        newStatus = "Pertimbangkan"
      }

      await orderStore.update(selectedOrder.id, {
        status: newStatus,
        hasilSlik: slikResult,
      })

      // Add note with SLIK result
      if (user) {
        const noteMessage = slikNote ? `Hasil SLIK: ${slikResult}. Catatan: ${slikNote}` : `Hasil SLIK: ${slikResult}`

        await orderStore.addNote(selectedOrder.id, {
          id: crypto.randomUUID(),
          orderId: selectedOrder.id,
          userId: user.id,
          userName: user.namaLengkap,
          role: user.role,
          note: noteMessage,
          status: newStatus,
          createdAt: new Date().toISOString(),
        })
      }

      toast({ title: "Berhasil", description: "Hasil SLIK berhasil disimpan" })
      setShowSlikDialog(false)
      setSlikResult("")
      setSlikNote("")
      await loadOrders()
    } catch (error) {
      console.error("Error submitting SLIK:", error)
      toast({ title: "Error", description: "Gagal menyimpan hasil SLIK", variant: "destructive" })
    } finally {
      setProcessingAction(false)
    }
  }

  const handlePertimbanganSubmit = async () => {
    if (!selectedOrder) return

    try {
      setProcessingAction(true)

      const newStatus: OrderStatus = pertimbanganAction

      await orderStore.update(selectedOrder.id, { status: newStatus })

      // Add note
      if (user && pertimbanganNote) {
        await orderStore.addNote(selectedOrder.id, {
          id: crypto.randomUUID(),
          orderId: selectedOrder.id,
          userId: user.id,
          userName: user.namaLengkap,
          role: user.role,
          note: `Keputusan ${pertimbanganAction}: ${pertimbanganNote}`,
          status: newStatus,
          createdAt: new Date().toISOString(),
        })
      }

      toast({ title: "Berhasil", description: `Order telah di-${pertimbanganAction}` })
      setShowPertimbanganDialog(false)
      setPertimbanganNote("")
      await loadOrders()
    } catch (error) {
      console.error("Error submitting pertimbangan:", error)
      toast({ title: "Error", description: "Gagal menyimpan keputusan", variant: "destructive" })
    } finally {
      setProcessingAction(false)
    }
  }

  const handleAddNote = async () => {
    if (!selectedOrder || !noteText || !user) return

    try {
      setProcessingAction(true)

      await orderStore.addNote(selectedOrder.id, {
        id: crypto.randomUUID(),
        orderId: selectedOrder.id,
        userId: user.id,
        userName: user.namaLengkap,
        role: user.role,
        note: noteText,
        status: selectedOrder.status,
        createdAt: new Date().toISOString(),
      })

      toast({ title: "Berhasil", description: "Catatan berhasil ditambahkan" })
      setShowNoteDialog(false)
      setNoteText("")
      await loadOrders()
    } catch (error) {
      console.error("Error adding note:", error)
      toast({ title: "Error", description: "Gagal menambahkan catatan", variant: "destructive" })
    } finally {
      setProcessingAction(false)
    }
  }

  const getActionButton = (order: Order) => {
    if (!user) return null

    const isCmo = user.role === "cmo"
    const isCmh = user.role === "cmh"

    switch (order.status) {
      case "Baru":
        if (isCmo) {
          return (
            <Button size="sm" onClick={() => handleStatusChange(order, "Claim")} disabled={processingAction}>
              Claim
            </Button>
          )
        }
        break
      case "Claim":
        if (isCmo) {
          return (
            <Button
              size="sm"
              onClick={() => {
                setSelectedOrder(order)
                setShowSlikDialog(true)
              }}
              disabled={processingAction}
            >
              Cek SLIK
            </Button>
          )
        }
        break
      case "Cek Slik":
        if (isCmo) {
          return (
            <Button size="sm" onClick={() => handleStatusChange(order, "Proses")} disabled={processingAction}>
              Survey
            </Button>
          )
        }
        break
      case "Pertimbangkan":
        if (isCmh) {
          return (
            <Button
              size="sm"
              onClick={() => {
                setSelectedOrder(order)
                setShowPertimbanganDialog(true)
              }}
              disabled={processingAction}
            >
              Keputusan
            </Button>
          )
        }
        break
      default:
        break
    }

    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Tracking Order</h1>
        <p className="text-muted-foreground">Kelola dan proses semua order</p>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {STATUS_ORDER.map((status) => (
          <Card
            key={status}
            className={`cursor-pointer transition-all hover:shadow-md ${
              statusFilter === status ? "ring-2 ring-primary bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => handleStatusCardClick(status)}
          >
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${statusFilter === status ? "text-primary-foreground" : ""}`}>
                {statusCounts[status]}
              </p>
              <p
                className={`text-xs truncate ${statusFilter === status ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                {status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nasabah, sales, unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          {paginatedOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada order ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
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
                        <td className="p-2">
                          <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                        </td>
                        <td className="p-2 text-sm">{formatDate(order.createdAt)}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleViewDetail(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {getActionButton(order)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {paginatedOrders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{order.namaNasabah}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.merk} - {order.typeUnit}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        <p>Sales: {order.salesName}</p>
                        <p>CMO: {order.cmoName || "-"}</p>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(order)}>
                          <Eye className="h-4 w-4 mr-1" /> Detail
                        </Button>
                        {getActionButton(order)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                  </Button>
                  <span className="text-sm">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Order Dialog */}
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
                  <Badge className={STATUS_COLORS[selectedOrder.status]}>{selectedOrder.status}</Badge>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="pt-4 border-t">
                <Label className="text-muted-foreground mb-2 block">Progress Status</Label>
                <div className="flex items-center justify-between overflow-x-auto pb-2">
                  {STATUS_ORDER.slice(0, 7).map((status, index) => {
                    const currentIndex = STATUS_ORDER.indexOf(selectedOrder.status)
                    const statusIndex = index
                    const isCompleted = statusIndex < currentIndex
                    const isCurrent = status === selectedOrder.status

                    return (
                      <div key={status} className="flex flex-col items-center min-w-[60px]">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isCurrent
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : isCurrent ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </div>
                        <span className="text-xs mt-1 text-center">{status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Documents Section */}
              <div className="pt-4 border-t">
                <Label className="text-muted-foreground mb-2 block">Dokumen Lampiran</Label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedOrder.fotoKtpNasabah && (
                    <a
                      href={selectedOrder.fotoKtpNasabah}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 border rounded hover:bg-muted"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">KTP Nasabah</span>
                    </a>
                  )}
                  {selectedOrder.fotoKtpPasangan && (
                    <a
                      href={selectedOrder.fotoKtpPasangan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 border rounded hover:bg-muted"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">KTP Pasangan</span>
                    </a>
                  )}
                  {selectedOrder.fotoKk && (
                    <a
                      href={selectedOrder.fotoKk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 border rounded hover:bg-muted"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Kartu Keluarga</span>
                    </a>
                  )}
                  {selectedOrder.fotoSurvey &&
                    selectedOrder.fotoSurvey.length > 0 &&
                    selectedOrder.fotoSurvey.map((foto, idx) => (
                      <a
                        key={idx}
                        href={foto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 border rounded hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Foto Survey {idx + 1}</span>
                      </a>
                    ))}
                </div>
                {!selectedOrder.fotoKtpNasabah &&
                  !selectedOrder.fotoKtpPasangan &&
                  !selectedOrder.fotoKk &&
                  (!selectedOrder.fotoSurvey || selectedOrder.fotoSurvey.length === 0) && (
                    <p className="text-sm text-muted-foreground">Tidak ada dokumen lampiran</p>
                  )}
              </div>

              {/* Notes Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-muted-foreground">Catatan</Label>
                  {user && (user.role === "cmo" || user.role === "cmh") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNoteDialog(true)
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Tambah Catatan
                    </Button>
                  )}
                </div>
                {selectedOrder.notes && selectedOrder.notes.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedOrder.notes.map((note, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{note.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {note.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <p>{note.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada catatan</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SLIK Dialog */}
      <Dialog open={showSlikDialog} onOpenChange={setShowSlikDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Hasil SLIK</DialogTitle>
            <DialogDescription>Masukkan hasil pengecekan SLIK</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hasil SLIK</Label>
              <Select value={slikResult} onValueChange={setSlikResult}>
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
            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan hasil SLIK..."
                value={slikNote}
                onChange={(e) => setSlikNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlikDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSlikSubmit} disabled={!slikResult || processingAction}>
              {processingAction ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pertimbangan Dialog for CMH */}
      <Dialog open={showPertimbanganDialog} onOpenChange={setShowPertimbanganDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keputusan Pertimbangan</DialogTitle>
            <DialogDescription>Berikan keputusan untuk order ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Keputusan</Label>
              <Select
                value={pertimbanganAction}
                onValueChange={(v) => setPertimbanganAction(v as "Approve" | "Reject")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approve">Approve</SelectItem>
                  <SelectItem value="Reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Berikan alasan keputusan..."
                value={pertimbanganNote}
                onChange={(e) => setPertimbanganNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPertimbanganDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handlePertimbanganSubmit}
              disabled={processingAction}
              variant={pertimbanganAction === "Reject" ? "destructive" : "default"}
            >
              {processingAction ? "Menyimpan..." : pertimbanganAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Catatan</DialogTitle>
            <DialogDescription>Tambahkan catatan untuk order ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea placeholder="Tulis catatan..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleAddNote} disabled={!noteText || processingAction}>
              {processingAction ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
