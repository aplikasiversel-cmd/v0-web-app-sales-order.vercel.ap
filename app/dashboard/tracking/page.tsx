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
  Clock,
  Calendar,
  Camera,
  Upload,
  Edit,
  Loader2,
  Download,
  FileText,
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
          const filteredByCmo = ordersArray.filter((o) => o.cmoId === user.id)
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
  }, [orders, searchQuery, statusFilter])

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

    await orderStore.update(order.id, {
      status: newStatus,
      notes: [...order.notes, newNote],
    })
    await loadOrders()
  }

  const handleClaim = async (order: Order) => {
    if (!user) return
    await addNote(order, `Order di-claim oleh ${user.namaLengkap}`, "Claim")
    toast({ title: "Berhasil", description: "Order berhasil di-claim" })
  }

  const handleCekSlik = async (order: Order) => {
    setSelectedOrder(order)
    setShowProcessDialog(true)
  }

  const handleStartSlikCheck = async (order: Order) => {
    await addNote(order, "Proses pengecekan SLIK dimulai", "Cek Slik")
    toast({ title: "Berhasil", description: "Order dipindahkan ke tahap Cek SLIK" })
  }

  const handleSlikResult = async (decision: "Proses" | "Pertimbangkan" | "Reject") => {
    if (!selectedOrder || !hasilSlik || !user) return

    const noteText = `Hasil SLIK: ${hasilSlik}. Keputusan: ${decision}`
    await addNote(selectedOrder, noteText, decision === "Proses" ? "Proses" : decision)

    if (decision === "Proses") {
      await orderStore.update(selectedOrder.id, { hasilSlik })
    }

    await notifySlikOrDecision(
      selectedOrder.id,
      selectedOrder.namaNasabah,
      selectedOrder.salesId,
      user.namaLengkap,
      user.id,
      "slik_result",
      hasilSlik,
    )

    setHasilSlik("")
    setShowProcessDialog(false)
    toast({ title: "Berhasil", description: `Order berhasil diproses: ${decision}` })
  }

  const handleSetSurveyDate = async () => {
    if (!selectedOrder || !tanggalSurvey) return

    // Save survey date and checklist
    await orderStore.update(selectedOrder.id, {
      tanggalSurvey,
      checklist,
    })

    await addNote(selectedOrder, `Tanggal survey ditetapkan: ${tanggalSurvey}`, "Proses")

    // Don't reset checklist, keep dialog open for foto upload
    toast({ title: "Berhasil", description: "Tanggal survey dan checklist dokumen berhasil disimpan" })

    // Refresh selected order
    const updatedOrder = await orderStore.getById(selectedOrder.id)
    if (updatedOrder) {
      setSelectedOrder(updatedOrder)
    }
    await loadOrders()
  }

  const handleFotoSurveyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setIsUploadingFoto(true)

    const processFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            // Compress image if it's too large
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement("canvas")
              const maxWidth = 800
              const maxHeight = 600
              let { width, height } = img

              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height)
                width *= ratio
                height *= ratio
              }

              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext("2d")
              ctx?.drawImage(img, 0, 0, width, height)

              // Compress to JPEG with quality 0.7
              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7)
              resolve(compressedDataUrl)
            }
            img.onerror = reject
            img.src = event.target.result as string
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    Promise.all(Array.from(files).map(processFile))
      .then((compressedImages) => {
        setFotoSurvey((prev) => [...prev, ...compressedImages])
        setIsUploadingFoto(false)
      })
      .catch((error) => {
        console.error("Error processing images:", error)
        setIsUploadingFoto(false)
        toast({
          title: "Error",
          description: "Gagal memproses gambar",
          variant: "destructive",
        })
      })
  }

  const handleSaveFotoSurvey = async () => {
    if (!selectedOrder || fotoSurvey.length === 0) return

    setIsUploadingFoto(true)

    try {
      await orderStore.update(selectedOrder.id, {
        fotoSurvey,
      })

      await addNote(selectedOrder, `Foto survey diupload (${fotoSurvey.length} foto)`, "Proses")
      toast({ title: "Berhasil", description: "Foto survey berhasil disimpan. Order dapat di Map In." })

      // Refresh
      const updatedOrder = await orderStore.getById(selectedOrder.id)
      if (updatedOrder) {
        setSelectedOrder(updatedOrder)
      }
      await loadOrders()
    } catch (error) {
      console.error("Error saving foto survey:", error)
      toast({
        title: "Error",
        description: "Gagal menyimpan foto survey. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingFoto(false)
    }
  }

  const handleMapIn = async (order: Order) => {
    if (!order.fotoSurvey || order.fotoSurvey.length === 0) {
      toast({
        title: "Tidak dapat Map In",
        description: "Upload foto survey terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    await addNote(order, "Order masuk ke Map In - menunggu keputusan final", "Map In")
    setShowSurveyDialog(false)
    toast({ title: "Berhasil", description: "Order berhasil masuk Map In. Silakan pilih Approve atau Reject." })
  }

  const openMapInDecisionDialog = (order: Order) => {
    setSelectedOrder(order)
    setMapInDecisionNote("")
    setShowMapInDecisionDialog(true)
  }

  const handleMapInDecision = async (decision: "Approve" | "Reject") => {
    if (!selectedOrder || !user) return

    const noteText = `Keputusan Final: ${decision}${mapInDecisionNote ? `. Catatan: ${mapInDecisionNote}` : ""}`
    await addNote(selectedOrder, noteText, decision)

    await notifySlikOrDecision(
      selectedOrder.id,
      selectedOrder.namaNasabah,
      selectedOrder.salesId,
      user.namaLengkap,
      user.id,
      decision === "Approve" ? "order_approve" : "order_reject",
      mapInDecisionNote,
    )

    setMapInDecisionNote("")
    setShowMapInDecisionDialog(false)
    toast({ title: "Berhasil", description: `Order ${decision === "Approve" ? "disetujui" : "ditolak"}` })
  }

  const handleFinalDecision = async (order: Order, decision: "Approve" | "Reject", note: string) => {
    if (!user) return
    await addNote(order, `Keputusan Final: ${decision}. ${note}`, decision)

    await notifySlikOrDecision(
      order.id,
      order.namaNasabah,
      order.salesId,
      user.namaLengkap,
      user.id,
      decision === "Approve" ? "order_approve" : "order_reject",
      note,
    )

    toast({ title: "Berhasil", description: `Order ${decision === "Approve" ? "disetujui" : "ditolak"}` })
  }

  const handleBanding = async () => {
    if (!selectedOrder || !user || !bandingNote) return

    const newNote = {
      id: generateId(),
      userId: user.id,
      userName: user.namaLengkap,
      role: user.role,
      note: `BANDING: ${bandingNote}`,
      status: selectedOrder.status,
      createdAt: new Date().toISOString(),
    }

    await orderStore.update(selectedOrder.id, {
      notes: [...selectedOrder.notes, newNote],
    })

    setBandingNote("")
    setShowBandingDialog(false)
    await loadOrders()
    toast({ title: "Berhasil", description: "Banding berhasil diajukan" })
  }

  const handleCmhDecision = async (decision: "Lanjut" | "Reject") => {
    if (!selectedOrder || !user) return

    const newStatus = decision === "Lanjut" ? "Proses" : "Reject"
    const noteText = `CMH Decision: ${decision}${cmhNote ? `. Catatan: ${cmhNote}` : ""}`
    await addNote(selectedOrder, noteText, newStatus)

    setCmhNote("")
    setShowCmhDialog(false)
    toast({ title: "Berhasil", description: `Order ${decision === "Lanjut" ? "dilanjutkan" : "ditolak"} oleh CMH` })
  }

  const openSurveyDialog = async (order: Order) => {
    setSelectedOrder(order)
    setTanggalSurvey(order.tanggalSurvey || "")
    setChecklist(
      order.checklist || {
        ktpPemohon: false,
        ktpPasangan: false,
        kartuKeluarga: false,
        npwp: false,
        bkr: false,
        livin: false,
        rekTabungan: false,
        mufApp: false,
      },
    )
    setFotoSurvey(order.fotoSurvey || [])
    setShowSurveyDialog(true)
  }

  const handleDownloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: "Berhasil", description: `File ${filename} berhasil didownload` })
  }

  const isSales = user?.role === "sales"
  const isCMO = user?.role === "cmo"
  const isCMH = user?.role === "cmh"
  const isAdmin = user?.role === "admin" // <-- Added isAdmin check
  const canDownloadFiles = isCMO || isCMH || isAdmin // <-- Added isAdmin to canDownloadFiles

  if (!user) return null

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader
          title="Tracking Order"
          description={isSales ? "Lacak status order Anda" : "Kelola dan proses semua order"}
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
        description={isSales ? "Lacak status order Anda" : "Kelola dan proses semua order"}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Status Summary for CMO/CMH */}
        {(isCMO || isCMH || isAdmin) && ( // <-- Show for Admin too
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {STATUS_LIST.map((status) => {
              const count = orders.filter((o) => o.status === status).length
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                  className={cn(
                    "p-2 rounded-lg text-center transition-colors",
                    statusFilter === status ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted",
                  )}
                >
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs truncate">{status}</p>
                </button>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isSales ? "Cari nasabah, unit, atau merk..." : "Cari nasabah, sales, unit..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
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

        {/* Orders Table - Updated with smooth UI and name columns */}
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle>Daftar Order</CardTitle>
            <CardDescription>{filteredOrders.length} order ditemukan</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tidak ada order ditemukan</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nasabah</TableHead>
                      {(isCMO || isCMH || isAdmin) && <TableHead className="hidden md:table-cell">Sales</TableHead>}
                      {(isSales || isAdmin) && <TableHead className="hidden md:table-cell">CMO</TableHead>}
                      <TableHead>Unit</TableHead>
                      <TableHead className="hidden md:table-cell">OTR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="transition-colors hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.namaNasabah}</p>
                            <p className="text-xs text-muted-foreground">{order.noHp}</p>
                            <div className="md:hidden mt-1 space-y-0.5">
                              {(isCMO || isCMH || isAdmin) && order.salesName && (
                                <p className="text-xs text-blue-600">Sales: {order.salesName}</p>
                              )}
                              {(isSales || isAdmin) && order.cmoName && (
                                <p className="text-xs text-green-600">CMO: {order.cmoName}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {(isCMO || isCMH || isAdmin) && (
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm">{order.salesName || "-"}</p>
                          </TableCell>
                        )}
                        {(isSales || isAdmin) && (
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm">{order.cmoName || "-"}</p>
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.typeUnit}</p>
                            <p className="text-xs text-muted-foreground">{order.merk}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatRupiah(order.otr)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowDetailDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* CMO Actions */}
                            {isCMO && order.status === "Baru" && (
                              <Button variant="ghost" size="icon" onClick={() => handleClaim(order)}>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            {isCMO && order.status === "Claim" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Mulai Cek SLIK"
                                onClick={() => handleStartSlikCheck(order)}
                              >
                                <Clock className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                            {isCMO && order.status === "Cek Slik" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Input Hasil SLIK"
                                onClick={() => handleCekSlik(order)}
                              >
                                <FileText className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            {isCMO && order.status === "Proses" && (
                              <Button variant="ghost" size="icon" onClick={() => openSurveyDialog(order)}>
                                <Calendar className="h-4 w-4 text-cyan-500" />
                              </Button>
                            )}
                            {isCMO && order.status === "Map In" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit Survey"
                                  onClick={() => openSurveyDialog(order)}
                                >
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Keputusan Final"
                                  onClick={() => openMapInDecisionDialog(order)}
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </Button>
                              </>
                            )}

                            {/* CMH Actions for Pertimbangkan */}
                            {isCMH && order.status === "Pertimbangkan" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setShowCmhDialog(true)
                                }}
                              >
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </Button>
                            )}
                            {isCMH && order.status === "Cek Slik" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Input Hasil SLIK"
                                onClick={() => handleCekSlik(order)}
                              >
                                <FileText className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}

                            {/* Sales Banding */}
                            {isSales && order.status === "Reject" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setShowBandingDialog(true)
                                }}
                              >
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
            <div className="space-y-6">
              <OrderTimeline currentStatus={selectedOrder.status} />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ID Order</p>
                  <p className="font-mono text-sm">{selectedOrder.id}</p>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama Nasabah</p>
                  <p className="font-medium">{selectedOrder.namaNasabah}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No HP</p>
                  <p className="font-medium">{selectedOrder.noHp}</p>
                </div>
                {selectedOrder.namaPasangan && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nama Pasangan</p>
                    <p className="font-medium">{selectedOrder.namaPasangan}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Type Unit</p>
                  <p className="font-medium">{selectedOrder.typeUnit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Merk / Dealer</p>
                  <p className="font-medium">{selectedOrder.merk}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.dealer}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sales</p>
                  <p className="font-medium">{selectedOrder.salesName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">OTR</p>
                  <p className="font-medium">{formatRupiah(selectedOrder.otr)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">TDP</p>
                  <p className="font-medium">{formatRupiah(selectedOrder.tdp)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Angsuran</p>
                  <p className="font-medium">{formatRupiah(selectedOrder.angsuran)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tenor</p>
                  <p className="font-medium">{selectedOrder.tenor} Bulan</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CMO</p>
                  <p className="font-medium">{selectedOrder.cmoName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Order</p>
                  <p className="font-medium">{formatTanggalWaktu(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {selectedOrder.catatanKhusus && (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan Khusus</p>
                  <p className="font-medium">{selectedOrder.catatanKhusus}</p>
                </div>
              )}

              {selectedOrder.hasilSlik && (
                <div>
                  <p className="text-sm text-muted-foreground">Hasil SLIK</p>
                  <p className="font-medium">{selectedOrder.hasilSlik}</p>
                </div>
              )}

              {selectedOrder.tanggalSurvey && (
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Survey</p>
                  <p className="font-medium">{selectedOrder.tanggalSurvey}</p>
                </div>
              )}

              {selectedOrder.notes && Array.isArray(selectedOrder.notes) && selectedOrder.notes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Riwayat Catatan</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto scroll-smooth">
                    {selectedOrder.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg bg-muted/50 text-sm transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {note.userName || "Unknown"} ({(note.role || "").toUpperCase()})
                          </span>
                          <span className="text-xs text-muted-foreground">{formatTanggalWaktu(note.createdAt)}</span>
                        </div>
                        <p>{note.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div>
                <p className="text-sm font-medium mb-2">Dokumen</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedOrder.fotoKtpNasabah && (
                    <div className="space-y-1">
                      <img
                        src={selectedOrder.fotoKtpNasabah || "/placeholder.svg"}
                        alt="KTP Nasabah"
                        className="w-full h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                        onClick={() => window.open(selectedOrder.fotoKtpNasabah, "_blank")}
                      />
                      <p className="text-xs text-center text-muted-foreground">KTP Nasabah</p>
                      {canDownloadFiles && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs bg-transparent"
                          onClick={() =>
                            handleDownloadFile(
                              selectedOrder.fotoKtpNasabah!,
                              `KTP_Nasabah_${selectedOrder.namaNasabah}.jpg`,
                            )
                          }
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  )}
                  {selectedOrder.fotoKtpPasangan && (
                    <div className="space-y-1">
                      <img
                        src={selectedOrder.fotoKtpPasangan || "/placeholder.svg"}
                        alt="KTP Pasangan"
                        className="w-full h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                        onClick={() => window.open(selectedOrder.fotoKtpPasangan, "_blank")}
                      />
                      <p className="text-xs text-center text-muted-foreground">KTP Pasangan</p>
                      {canDownloadFiles && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs bg-transparent"
                          onClick={() =>
                            handleDownloadFile(
                              selectedOrder.fotoKtpPasangan!,
                              `KTP_Pasangan_${selectedOrder.namaNasabah}.jpg`,
                            )
                          }
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  )}
                  {selectedOrder.fotoKk && (
                    <div className="space-y-1">
                      <img
                        src={selectedOrder.fotoKk || "/placeholder.svg"}
                        alt="Kartu Keluarga"
                        className="w-full h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                        onClick={() => window.open(selectedOrder.fotoKk, "_blank")}
                      />
                      <p className="text-xs text-center text-muted-foreground">Kartu Keluarga</p>
                      {canDownloadFiles && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs bg-transparent"
                          onClick={() =>
                            handleDownloadFile(selectedOrder.fotoKk!, `KK_${selectedOrder.namaNasabah}.jpg`)
                          }
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Foto Survey */}
              {selectedOrder.fotoSurvey && selectedOrder.fotoSurvey.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Foto Survey</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedOrder.fotoSurvey.map((foto, idx) => (
                      <div key={idx} className="space-y-1">
                        <img
                          src={foto || "/placeholder.svg"}
                          alt={`Foto Survey ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(foto, "_blank")}
                        />
                        <p className="text-xs text-center text-muted-foreground">Survey {idx + 1}</p>
                        {canDownloadFiles && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs bg-transparent"
                            onClick={() =>
                              handleDownloadFile(foto, `Survey_${idx + 1}_${selectedOrder.namaNasabah}.jpg`)
                            }
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog for CMO - SLIK */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hasil Pengecekan SLIK</DialogTitle>
            <DialogDescription>Masukkan hasil pengecekan SLIK dan pilih keputusan</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hasil SLIK *</Label>
              <Textarea
                value={hasilSlik}
                onChange={(e) => setHasilSlik(e.target.value.toUpperCase())}
                placeholder="Masukkan hasil pengecekan SLIK..."
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1"
                variant="default"
                onClick={() => handleSlikResult("Proses")}
                disabled={!hasilSlik}
              >
                Proses
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => handleSlikResult("Pertimbangkan")}
                disabled={!hasilSlik}
              >
                Pertimbangkan
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => handleSlikResult("Reject")}
                disabled={!hasilSlik}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Survey Dialog - updated untuk Map In edit */}
      <Dialog open={showSurveyDialog} onOpenChange={setShowSurveyDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.status === "Map In" ? "Edit Data Survey" : "Atur Survey & Checklist"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.status === "Map In"
                ? "Edit data survey sebelum memberikan keputusan final"
                : "Atur tanggal survey, checklist dokumen, dan upload foto survey"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Tanggal Survey */}
              <div className="space-y-2">
                <Label>Tanggal Survey *</Label>
                <Input type="date" value={tanggalSurvey} onChange={(e) => setTanggalSurvey(e.target.value)} />
              </div>

              {/* Checklist Dokumen */}
              <div className="space-y-2">
                <Label>Checklist Dokumen</Label>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border bg-muted/30">
                  {Object.entries({
                    ktpPemohon: "KTP Pemohon",
                    ktpPasangan: "KTP Pasangan",
                    kartuKeluarga: "Kartu Keluarga",
                    npwp: "NPWP",
                    bkr: "BKR",
                    livin: "Livin",
                    rekTabungan: "Rek Tabungan/Nota",
                    mufApp: "MufApp",
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={checklist[key as keyof OrderChecklist]}
                        onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, [key]: checked as boolean }))}
                      />
                      <label htmlFor={key} className="text-sm cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={handleSetSurveyDate}
                disabled={!tanggalSurvey}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Simpan Tanggal & Checklist
              </Button>

              {/* Upload Foto Survey */}
              <div className="space-y-2">
                <Label>Upload Foto Survey</Label>
                <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFotoSurveyUpload}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFoto}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Pilih Foto
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Upload hasil survey lapangan</p>
                    {isUploadingFoto && <p className="text-xs text-primary mt-2">Uploading...</p>}
                  </div>
                </div>

                {/* Preview Foto Survey */}
                {fotoSurvey.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{fotoSurvey.length} foto dipilih</p>
                    <div className="grid grid-cols-3 gap-2">
                      {fotoSurvey.map((foto, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={foto || "/placeholder.svg"}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => setFotoSurvey((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={handleSaveFotoSurvey}
                      disabled={isUploadingFoto}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Simpan Foto Survey
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons - berbeda untuk status Proses vs Map In */}
              {selectedOrder.status === "Proses" && (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => handleMapIn(selectedOrder)}
                      disabled={!selectedOrder.fotoSurvey || selectedOrder.fotoSurvey.length === 0 || isUploadingFoto}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Map In
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        addNote(selectedOrder, "Order ditolak pada tahap survey", "Reject")
                        setShowSurveyDialog(false)
                        toast({ title: "Order ditolak", description: "Order berhasil di-reject" })
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>

                  {(!selectedOrder.fotoSurvey || selectedOrder.fotoSurvey.length === 0) && (
                    <p className="text-xs text-amber-600 text-center">
                      * Upload foto survey terlebih dahulu untuk dapat melakukan Map In
                    </p>
                  )}
                </>
              )}

              {selectedOrder.status === "Map In" && (
                <div className="pt-4 border-t">
                  <Button
                    className="w-full bg-transparent"
                    variant="outline"
                    onClick={() => {
                      // Update order dengan data terbaru
                      orderStore.update(selectedOrder.id, {
                        tanggalSurvey,
                        checklist,
                        fotoSurvey,
                      })
                      addNote(selectedOrder, "Data survey diperbarui", "Map In")
                      setShowSurveyDialog(false)
                      loadOrders()
                      toast({ title: "Berhasil", description: "Data survey berhasil diperbarui" })
                    }}
                    disabled={isUploadingFoto}
                  >
                    Simpan Perubahan
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Gunakan tombol keputusan di tabel untuk Approve atau Reject
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMapInDecisionDialog} onOpenChange={setShowMapInDecisionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keputusan Final</DialogTitle>
            <DialogDescription>Pilih Approve atau Reject untuk order ini</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Nasabah</p>
                    <p className="font-medium">{selectedOrder.namaNasabah}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unit</p>
                    <p className="font-medium">{selectedOrder.typeUnit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">OTR</p>
                    <p className="font-medium">{formatRupiah(selectedOrder.otr)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">TDP</p>
                    <p className="font-medium">{formatRupiah(selectedOrder.tdp)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan (opsional)</Label>
                <Textarea
                  value={mapInDecisionNote}
                  onChange={(e) => setMapInDecisionNote(e.target.value.toUpperCase())}
                  placeholder="Tambahkan catatan untuk keputusan ini..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1" onClick={() => handleMapInDecision("Approve")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleMapInDecision("Reject")}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CMH Decision Dialog */}
      <Dialog open={showCmhDialog} onOpenChange={setShowCmhDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keputusan CMH</DialogTitle>
            <DialogDescription>
              Order dalam status Pertimbangkan. Berikan keputusan untuk melanjutkan atau menolak order ini.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Nasabah</p>
                    <p className="font-medium">{selectedOrder.namaNasabah}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unit</p>
                    <p className="font-medium">{selectedOrder.typeUnit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">OTR</p>
                    <p className="font-medium">{formatRupiah(selectedOrder.otr)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">TDP</p>
                    <p className="font-medium">{formatRupiah(selectedOrder.tdp)}</p>
                  </div>
                </div>
              </div>

              {selectedOrder.hasilSlik && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-700 font-medium mb-1">Hasil SLIK:</p>
                  <p className="text-sm text-amber-900">{selectedOrder.hasilSlik}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Catatan CMH</Label>
                <Textarea
                  value={cmhNote}
                  onChange={(e) => setCmhNote(e.target.value.toUpperCase())}
                  placeholder="Tambahkan catatan untuk keputusan ini..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1" onClick={() => handleCmhDecision("Lanjut")}>
                  Lanjutkan ke Proses
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleCmhDecision("Reject")}>
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Banding Dialog */}
      <Dialog open={showBandingDialog} onOpenChange={setShowBandingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Banding</DialogTitle>
            <DialogDescription>Jelaskan alasan pengajuan banding untuk order ini</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alasan Banding *</Label>
              <Textarea
                value={bandingNote}
                onChange={(e) => setBandingNote(e.target.value.toUpperCase())}
                placeholder="Jelaskan alasan pengajuan banding..."
                rows={4}
              />
            </div>

            <Button className="w-full" onClick={handleBanding} disabled={!bandingNote}>
              Ajukan Banding
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
