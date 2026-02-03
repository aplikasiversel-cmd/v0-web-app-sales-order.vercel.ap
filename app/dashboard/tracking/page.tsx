"use client"

import type React from "react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { orderStore, notificationStore, userStore } from "@/lib/data-store"
import type { Order, OrderStatus, User, OrderChecklist } from "@/lib/types"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import {
  Search,
  Filter,
  Eye,
  CalendarIcon,
  FileText,
  CheckCircle,
  Clock,
  Circle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Upload,
  FileCheck,
  Camera,
  AlertCircle,
  X,
  CheckCircle2,
  ExternalLink,
  Download,
  XCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

function base64ToBlob(base64: string): Blob {
  // Handle data URL format
  const parts = base64.split(",")
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg"
  const byteString = atob(parts[1])
  const arrayBuffer = new ArrayBuffer(byteString.length)
  const uint8Array = new Uint8Array(arrayBuffer)
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i)
  }
  return new Blob([uint8Array], { type: mime })
}

function openImageInNewTab(base64OrUrl: string) {
  // Check if it's a data URL (base64)
  if (base64OrUrl.startsWith("data:")) {
    const blob = base64ToBlob(base64OrUrl)
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, "_blank")
  } else {
    // Regular URL, open directly
    window.open(base64OrUrl, "_blank")
  }
}

function downloadImage(base64OrUrl: string, filename: string) {
  const link = document.createElement("a")
  if (base64OrUrl.startsWith("data:")) {
    const blob = base64ToBlob(base64OrUrl)
    const blobUrl = URL.createObjectURL(blob)
    link.href = blobUrl
  } else {
    link.href = base64OrUrl
  }
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// </CHANGE>

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

// Helper function to format currency
const formatRupiah = (number: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number)
}

export default function TrackingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"nasabah" | "sales" | "cmo" | "status" | "tanggal">("tanggal")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showSlikDialog, setShowSlikDialog] = useState(false)
  const [showPertimbanganDialog, setShowPertimbanganDialog] = useState(false)
  const [pertimbanganAction, setPertimbanganAction] = useState<"Approve" | "Reject">("Approve")
  const [pertimbanganNote, setPertimbanganNote] = useState("")
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [noteText, setNoteText] = useState("") // Declare noteText and setNoteText
  const [showSurveyDialog, setShowSurveyDialog] = useState(false)
  const [showMapInDialog, setShowMapInDialog] = useState(false)
  const [mapInAction, setMapInAction] = useState<"Map In" | "Reject">("Map In")
  const [mapInNote, setMapInNote] = useState("")
  const [showCmhNoteDialog, setShowCmhNoteDialog] = useState(false)
  const [cmhDecision, setCmhDecision] = useState<"Approve" | "Reject" | null>(null)
  const [cmhNote, setCmhNote] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [slikResult, setSlikResult] = useState<string>("")
  const [slikNote, setSlikNote] = useState("")
  const [slikDecision, setSlikDecision] = useState<"Proses" | "Pertimbangkan" | "Reject">("Proses")
  // const [surveyAction, setSurveyAction] = useState<"Survey" | "Janji Survey" | "Pemenuhan Berkas">("Survey") // Removed, handled by different states
  const [surveyNote, setSurveyNote] = useState("")
  const [surveyDate, setSurveyDate] = useState("")
  const [surveyPhotos, setSurveyPhotos] = useState<string[]>([])
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
  const [processingAction, setProcessingAction] = useState(false)

  // --- Renamed functions and updated types based on assumed new structures ---
  // Assuming `updateOrder` and `fetchOrders` are available or defined elsewhere
  // and `mapInDecision` is a state variable similar to `pertimbanganAction`.
  // For now, using placeholder names.
  const updateOrder = async (orderId: string, data: Partial<Order>) => {
    console.log(`Updating order ${orderId} with:`, data)
    // This should be replaced with actual API call to update order
    await orderStore.update(orderId, data)
  }

  const fetchOrders = async () => {
    console.log("Fetching orders...")
    await loadOrders()
  }
  // Assuming mapInDecision state exists, or using mapInAction directly if appropriate
  // For the sake of merging, let's assume `mapInDecision` is intended to be used.
  // If not, it should be `mapInAction`.
  // Let's use `mapInAction` as it's already defined.
  const mapInDecision = mapInAction

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const loadOrders = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const allOrders = await orderStore.getAll()
      console.log("[v0] TrackingPage - allOrders count:", allOrders.length)
      console.log("[v0] TrackingPage - user:", {
        id: user.id,
        username: user.username,
        role: user.role,
        namaLengkap: user.namaLengkap,
      })

      let ordersData: Order[] = []

      if (user.role === "admin" || user.role === "cmh") {
        // Admin dan CMH melihat semua order
        ordersData = allOrders
      } else if (user.role === "spv") {
        const allSales = await userStore.getByRole("sales")
        console.log("[v0] TrackingPage - allSales count:", allSales.length)

        const salesUnderSPV = allSales.filter(
          (s: User) =>
            s.spvId === user.id ||
            s.spvId === user.username ||
            s.spvName === user.namaLengkap ||
            s.spvName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
        )
        console.log(
          "[v0] TrackingPage - salesUnderSPV:",
          salesUnderSPV.map((s) => ({ id: s.id, nama: s.namaLengkap, spvId: s.spvId, spvName: s.spvName })),
        )

        const salesIds = salesUnderSPV.map((s: User) => s.id)
        const salesUsernames = salesUnderSPV.map((s: User) => s.username)
        const salesNames = salesUnderSPV.map((s: User) => s.namaLengkap?.toLowerCase())

        // Filter orders: dari sales di bawah SPV ATAU diinput langsung oleh SPV
        ordersData = allOrders.filter(
          (order: Order) =>
            // Orders dari sales di bawah SPV
            salesIds.includes(order.salesId) ||
            salesUsernames.includes(order.salesId) ||
            salesNames.includes(order.salesName?.toLowerCase()) ||
            // Orders yang diinput langsung oleh SPV sendiri
            order.salesId === user.id ||
            order.salesId === user.username ||
            order.salesName === user.namaLengkap ||
            order.salesName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
        )
        console.log("[v0] TrackingPage - spv filtered orders (including self-input):", ordersData.length)
      } else if (user.role === "cmo") {
        // CMO melihat order yang ditugaskan kepadanya
        ordersData = allOrders.filter(
          (o) =>
            o.cmoId === user.id ||
            o.cmoId === user.username ||
            o.cmoName === user.namaLengkap ||
            o.cmoName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
        )
        console.log("[v0] TrackingPage - cmo filtered orders:", ordersData.length)
      } else if (user.role === "sales") {
        // Sales hanya melihat order miliknya
        ordersData = allOrders.filter(
          (o) =>
            o.salesId === user.id ||
            o.salesId === user.username ||
            o.salesName === user.namaLengkap ||
            o.salesName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
        )
        console.log("[v0] TrackingPage - sales filtered orders:", ordersData.length)
      }

      setOrders(ordersData)
    } catch (error) {
      console.error("[v0] TrackingPage - Error loading orders:", error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadOrders()
    }
  }, [user, loadOrders])

  const filteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      const matchesSearch =
        order.namaNasabah.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.salesName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.typeUnit.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      return matchesSearch && matchesStatus
    })

    // Apply sorting
    result.sort((a, b) => {
      let compareA: string | number
      let compareB: string | number

      switch (sortBy) {
        case "nasabah":
          compareA = a.namaNasabah.toLowerCase()
          compareB = b.namaNasabah.toLowerCase()
          break
        case "sales":
          compareA = a.salesName.toLowerCase()
          compareB = b.salesName.toLowerCase()
          break
        case "cmo":
          compareA = (a.cmoName || "").toLowerCase()
          compareB = (b.cmoName || "").toLowerCase()
          break
        case "status":
          compareA = a.status
          compareB = b.status
          break
        case "tanggal":
          compareA = new Date(a.createdAt).getTime()
          compareB = new Date(b.createdAt).getTime()
          break
        default:
          return 0
      }

      if (compareA < compareB) {
        return sortOrder === "asc" ? -1 : 1
      }
      if (compareA > compareB) {
        return sortOrder === "asc" ? 1 : -1
      }
      return 0
    })

    return result
  }, [orders, searchQuery, statusFilter, sortBy, sortOrder])

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

      // CMO memilih keputusan manual: Proses, Pertimbangkan, atau Reject
      const newStatus: OrderStatus = slikDecision

      await orderStore.update(selectedOrder.id, {
        status: newStatus,
        hasilSlik: slikResult,
      })

      if (user) {
        const decisionText =
          slikDecision === "Proses"
            ? "Lanjut ke Survey"
            : slikDecision === "Pertimbangkan"
              ? "Dikirim ke CMH untuk pertimbangan"
              : "Ditolak (Reject)"
        const noteMessage = `Hasil SLIK: ${slikResult}. Keputusan: ${decisionText}${slikNote ? `. Catatan: ${slikNote}` : ""}`

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

      toast({ title: "Berhasil", description: `Hasil SLIK berhasil disimpan. Status: ${newStatus}` })
      setShowSlikDialog(false)
      setSlikResult("")
      setSlikNote("")
      setSlikDecision("Proses")
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

      const newStatus: OrderStatus = pertimbanganAction === "Approve" ? "Proses" : "Reject"

      await orderStore.update(selectedOrder.id, { status: newStatus })

      if (user) {
        const noteMessage =
          pertimbanganAction === "Approve"
            ? `Pertimbangan Disetujui: ${pertimbanganNote || "Lanjut ke proses survey"}`
            : `Pertimbangan Ditolak: ${pertimbanganNote || "Order ditolak"}`

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

      toast({
        title: "Berhasil",
        description: pertimbanganAction === "Approve" ? "Order dilanjutkan ke proses survey" : "Order ditolak",
      })
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

  // </CHANGE> Added handler for Map In decision
  const handleMapInSubmit = async () => {
    if (!selectedOrder) return

    setProcessingAction(true)
    try {
      // Using mapInAction directly as the state variable for the decision
      const newStatus = mapInAction

      // Prepare notes, assuming `notes` is an array in the Order type.
      // If `notes` is not a field or is structured differently, this needs adjustment.
      const newNotes = [
        ...(selectedOrder.notes || []), // Spread existing notes if any
        {
          // Assuming a structure for notes, adjust if necessary based on `Order` type
          id: crypto.randomUUID(), // Added unique ID for note
          orderId: selectedOrder.id,
          userId: user?.id || "", // Use optional chaining and provide default
          userName: user?.namaLengkap || "Unknown", // Use namaLengkap from user
          role: user?.role,
          note: `Keputusan Map In: ${mapInAction}. ${mapInNote}`,
          status: newStatus, // Status when the note was added
          createdAt: new Date().toISOString(),
        },
      ]

      await orderStore.update(selectedOrder.id, {
        status: newStatus,
        // Only add notes if mapInNote is provided, or always add the decision note
        // Here, we are always adding the decision note. Adjust if only mapInNote should trigger addition.
        notes: newNotes,
      })

      toast({ title: "Berhasil", description: `Order ${mapInAction === "Map In" ? "diajukan ke CMH" : "ditolak"}` })

      setShowMapInDialog(false)
      setMapInNote("")
      // Reset mapInAction to default if needed, or keep as is for next dialog open
      // For now, keeping it as is.

      // Close survey dialog after map-in decision if it was open
      if (showSurveyDialog) {
        setShowSurveyDialog(false)
      }
      resetSurveyForm() // Assuming this resets survey-related states
      await loadOrders() // Refresh the order list
    } catch (error) {
      console.error("Error submitting map in decision:", error)
      toast({ title: "Error", description: "Gagal memproses keputusan Map In", variant: "destructive" })
    } finally {
      setProcessingAction(false)
    }
  }
  // </CHANGE>

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

  useEffect(() => {
    if (showSurveyDialog && selectedOrder) {
      setSurveyDate(selectedOrder.tanggalSurvey || "")
      setSurveyPhotos(selectedOrder.fotoSurvey || [])
      setSurveyNote("")

      // Load checklist if exists - use 'checklist' field from Order type
      if (selectedOrder.checklist) {
        setChecklist(selectedOrder.checklist)
      } else {
        setChecklist({
          ktpPemohon: false,
          ktpPasangan: false,
          kartuKeluarga: false,
          npwp: false,
          bkr: false,
          livin: false,
          rekTabungan: false,
          mufApp: false,
        })
      }
    }
  }, [showSurveyDialog, selectedOrder])

  const isSurveyReadyForDecision = useMemo(() => {
    const hasPhotos = surveyPhotos.length > 0
    const allChecklistComplete = Object.values(checklist).every(Boolean)
    return hasPhotos && allChecklistComplete
  }, [surveyPhotos, checklist])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setSurveyPhotos((prev) => [...prev, event.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setSurveyPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleChecklistChange = (key: keyof OrderChecklist, checked: boolean) => {
    setChecklist((prev) => ({ ...prev, [key]: checked }))
  }

  const handleSaveDraft = async () => {
    if (!selectedOrder || !user) return

    try {
      setProcessingAction(true)

      // Simpan sebagai draft - status tetap "Proses"
      const newStatus: OrderStatus = "Proses"

      await orderStore.update(selectedOrder.id, {
        status: newStatus,
        tanggalSurvey: surveyDate || undefined,
        fotoSurvey: surveyPhotos.length > 0 ? surveyPhotos : undefined,
        checklist: checklist, // Use correct field name from Order type
      })

      let noteMessage = `Draft survey disimpan`
      if (surveyDate) {
        noteMessage += ` - Tanggal Survey: ${format(new Date(surveyDate), "d MMMM yyyy", { locale: idLocale })}`
      }
      noteMessage += ` - Checklist: ${Object.values(checklist).filter(Boolean).length}/8`
      noteMessage += ` - Foto: ${surveyPhotos.length}`
      if (surveyNote) {
        noteMessage += ` - Catatan: ${surveyNote}`
      }

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

      toast({ title: "Berhasil", description: "Draft survey berhasil disimpan" })
      setShowSurveyDialog(false)
      resetSurveyForm()
      await loadOrders()
    } catch (error) {
      console.error("Error submitting survey:", error)
      toast({ title: "Error", description: "Gagal menyimpan draft", variant: "destructive" })
    } finally {
      setProcessingAction(false)
    }
  }

  // Removed the previous handleMapInSubmit as it's being replaced by the new one.

  const resetSurveyForm = () => {
    setSurveyNote("")
    // setSurveyAction("Survey") // Removed, handled by different states
    setSurveyDate("")
    setSurveyPhotos([])
    setChecklist({
      ktpPemohon: false,
      ktpPasangan: false,
      kartuKeluarga: false,
      npwp: false,
      bkr: false,
      livin: false,
      rekTabungan: false,
      mufApp: false,
    })
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
      case "Proses":
        if (isCmo) {
          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedOrder(order)
                  setShowSurveyDialog(true)
                }}
                disabled={processingAction}
              >
                Survey
              </Button>
            </div>
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
      case "Survey":
        // CMO bisa buka dialog survey lagi untuk melengkapi berkas
        if (isCmo) {
          return (
            <Button
              size="sm"
              onClick={() => {
                // Load existing survey data from order
                setSelectedOrder(order)
                setSurveyDate(order.tanggalSurvey || "")
                setSurveyPhotos(order.fotoSurvey || [])
                setSurveyNote(order.surveyNote || "")
                // Load checklist if exists
                if (order.checklist) {
                  setChecklist(order.checklist)
                } else {
                  setChecklist({
                    ktpPemohon: false,
                    ktpPasangan: false,
                    kartuKeluarga: false,
                    npwp: false,
                    bkr: false,
                    livin: false,
                    rekTabungan: false,
                    mufApp: false,
                  })
                }
                setShowSurveyDialog(true)
              }}
              disabled={processingAction}
            >
              Lanjutkan Survey
            </Button>
          )
        }
        break
      case "Map In":
        if (isCmo || isCmh) {
          return (
            <Button
              size="sm"
              onClick={() => {
                setSelectedOrder(order)
                setShowMapInDialog(true)
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

  if (loading || authLoading) {
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
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">
                        <button
                          onClick={() => {
                            if (sortBy === "nasabah") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                            } else {
                              setSortBy("nasabah")
                              setSortOrder("asc")
                            }
                          }}
                          className="flex items-center gap-1 hover:text-primary font-medium"
                        >
                          Nasabah
                          {sortBy === "nasabah" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="text-left p-2">
                        <button
                          onClick={() => {
                            if (sortBy === "sales") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                            } else {
                              setSortBy("sales")
                              setSortOrder("asc")
                            }
                          }}
                          className="flex items-center gap-1 hover:text-primary font-medium"
                        >
                          Sales
                          {sortBy === "sales" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="text-left p-2">
                        <button
                          onClick={() => {
                            if (sortBy === "cmo") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                            } else {
                              setSortBy("cmo")
                              setSortOrder("asc")
                            }
                          }}
                          className="flex items-center gap-1 hover:text-primary font-medium"
                        >
                          CMO
                          {sortBy === "cmo" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="text-left p-2">
                        <button
                          onClick={() => {
                            if (sortBy === "status") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                            } else {
                              setSortBy("status")
                              setSortOrder("asc")
                            }
                          }}
                          className="flex items-center gap-1 hover:text-primary font-medium"
                        >
                          Status
                          {sortBy === "status" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="text-left p-2">
                        <button
                          onClick={() => {
                            if (sortBy === "tanggal") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                            } else {
                              setSortBy("tanggal")
                              setSortOrder("desc")
                            }
                          }}
                          className="flex items-center gap-1 hover:text-primary font-medium"
                        >
                          Tanggal
                          {sortBy === "tanggal" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
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
                          <CalendarIcon className="h-3 w-3" />
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(order)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                        {getActionButton(order)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

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

              <div className="pt-4 border-t">
                <Label className="text-muted-foreground mb-3 block">Dokumen & Foto</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* KTP Nasabah */}
                  {selectedOrder.fotoKtpNasabah && (
                    <div className="border rounded-lg p-2 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">KTP Nasabah</p>
                      <div className="relative aspect-video bg-muted rounded overflow-hidden">
                        <img
                          src={selectedOrder.fotoKtpNasabah || "/placeholder.svg"}
                          alt="KTP Nasabah"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs bg-transparent"
                          onClick={() => openImageInNewTab(selectedOrder.fotoKtpNasabah!)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs bg-transparent"
                          onClick={() => {
                            downloadImage(selectedOrder.fotoKtpNasabah!, `KTP_Nasabah_${selectedOrder.namaNasabah}.jpg`)
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Unduh
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* KTP Pasangan */}
                  {selectedOrder.fotoKtpPasangan && (
                    <div className="border rounded-lg p-2 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">KTP Pasangan</p>
                      <div className="relative aspect-video bg-muted rounded overflow-hidden">
                        <img
                          src={selectedOrder.fotoKtpPasangan || "/placeholder.svg"}
                          alt="KTP Pasangan"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs bg-transparent"
                          onClick={() => openImageInNewTab(selectedOrder.fotoKtpPasangan!)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs bg-transparent"
                          onClick={() => {
                            downloadImage(
                              selectedOrder.fotoKtpPasangan!,
                              `KTP_Pasangan_${selectedOrder.namaNasabah}.jpg`,
                            )
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Unduh
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Kartu Keluarga */}
                  {selectedOrder.fotoKk && (
                    <div className="border rounded-lg p-2 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Kartu Keluarga</p>
                      <div className="relative aspect-video bg-muted rounded overflow-hidden">
                        <img
                          src={selectedOrder.fotoKk || "/placeholder.svg"}
                          alt="Kartu Keluarga"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs bg-transparent"
                          onClick={() => openImageInNewTab(selectedOrder.fotoKk!)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs bg-transparent"
                          onClick={() => {
                            downloadImage(selectedOrder.fotoKk!, `KK_${selectedOrder.namaNasabah}.jpg`)
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Unduh
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Foto Survey */}
                  {selectedOrder.fotoSurvey &&
                    selectedOrder.fotoSurvey.length > 0 &&
                    selectedOrder.fotoSurvey.map((foto, idx) => (
                      <div key={idx} className="border rounded-lg p-2 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Foto Survey {idx + 1}</p>
                        <div className="relative aspect-video bg-muted rounded overflow-hidden">
                          <img
                            src={foto || "/placeholder.svg"}
                            alt={`Foto Survey ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs bg-transparent"
                            onClick={() => openImageInNewTab(foto)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Lihat
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs bg-transparent"
                            onClick={() => {
                              downloadImage(foto, `Survey_${selectedOrder.namaNasabah}_${idx + 1}.jpg`)
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Unduh
                          </Button>
                        </div>
                      </div>
                    ))}

                  {/* No documents message */}
                  {!selectedOrder.fotoKtpNasabah &&
                    !selectedOrder.fotoKtpPasangan &&
                    !selectedOrder.fotoKk &&
                    (!selectedOrder.fotoSurvey || selectedOrder.fotoSurvey.length === 0) && (
                      <div className="col-span-full text-center py-4 text-muted-foreground text-sm">
                        Belum ada dokumen/foto yang diupload
                      </div>
                    )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-muted-foreground mb-3 block">Progress Status</Label>
                <div className="flex items-center justify-between overflow-x-auto pb-2">
                  {(() => {
                    const isRejected = selectedOrder.status === "Reject"
                    // For rejected orders, show progress up to where it was rejected, then show Reject
                    // We'll show: Baru, Claim, Cek Slik, Proses, Pertimbangkan, Map In, then Reject (red)
                    const displayStatuses = isRejected
                      ? ([...STATUS_ORDER.slice(0, 6), "Reject"] as OrderStatus[])
                      : STATUS_ORDER.slice(0, 7)

                    return displayStatuses.map((status, index) => {
                      const isRejectStatus = status === "Reject"
                      // For rejected orders, the "current" status is Reject. For others, it's the actual status.
                      // The `currentIndex` calculation for `isCompleted` should be based on the actual order status, not "Reject" if the order is not rejected.
                      // If the order is rejected, we consider progress up to "Map In" as completed.
                      const actualStatusIndex = STATUS_ORDER.indexOf(selectedOrder.status)
                      const completedUntilIndex = isRejected ? 5 : actualStatusIndex

                      const isCompleted = !isRejected && index <= completedUntilIndex
                      const isCurrent = status === selectedOrder.status || (isRejected && isRejectStatus)

                      return (
                        <div key={status} className="flex flex-col items-center min-w-[60px]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isRejectStatus
                                ? "bg-red-500 text-white"
                                : isCompleted
                                  ? "bg-green-500 text-white"
                                  : isCurrent
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isRejectStatus ? (
                              <XCircle className="h-4 w-4" />
                            ) : isCompleted ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : isCurrent ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </div>
                          <span
                            className={`text-xs mt-1 text-center ${isRejectStatus ? "text-red-500 font-medium" : ""}`}
                          >
                            {status}
                          </span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-muted-foreground">Catatan</Label>
                  {user && (
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
                            {note.role?.toUpperCase() || "USER"}
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

      <Dialog open={showSlikDialog} onOpenChange={setShowSlikDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Hasil SLIK</DialogTitle>
            <DialogDescription>Masukkan hasil pengecekan SLIK dan pilih keputusan</DialogDescription>
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

            {/* Pilihan keputusan CMO setelah input hasil SLIK */}
            {slikResult && (
              <div className="space-y-2">
                <Label>Keputusan</Label>
                <Select
                  value={slikDecision}
                  onValueChange={(v) => setSlikDecision(v as "Proses" | "Pertimbangkan" | "Reject")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proses">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Proses</span>
                        <span className="text-xs text-muted-foreground">Lanjut ke Survey oleh CMO</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pertimbangkan">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Pertimbangkan</span>
                        <span className="text-xs text-muted-foreground">Kirim ke CMH untuk review</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Reject">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Reject</span>
                        <span className="text-xs text-muted-foreground">Keputusan final - ditolak</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Info box berdasarkan keputusan */}
                <div
                  className={`p-3 rounded-lg text-sm ${
                    slikDecision === "Proses"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : slikDecision === "Pertimbangkan"
                        ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {slikDecision === "Proses" && "Order akan lanjut ke tahap Survey. CMO akan melakukan survey nasabah."}
                  {slikDecision === "Pertimbangkan" && "Order akan dikirim ke CMH untuk dipertimbangkan lebih lanjut."}
                  {slikDecision === "Reject" && "Order akan ditolak secara final. Keputusan ini tidak dapat diubah."}
                </div>
              </div>
            )}

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
            <Button
              variant="outline"
              onClick={() => {
                setShowSlikDialog(false)
                setSlikResult("")
                setSlikNote("")
                setSlikDecision("Proses")
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleSlikSubmit}
              disabled={!slikResult || processingAction}
              variant={slikDecision === "Reject" ? "destructive" : "default"}
            >
              {processingAction ? "Menyimpan..." : slikDecision === "Reject" ? "Reject Order" : "Simpan & Lanjutkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog
        open={showSurveyDialog}
        onOpenChange={(open) => {
          setShowSurveyDialog(open)
          if (!open) resetSurveyForm()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proses Survey</DialogTitle>
            <DialogDescription>Lengkapi data survey untuk order {selectedOrder?.namaNasabah}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Jenis Proses */}
            {/* Removed the select for "Jenis Proses" as it's not directly used in logic and potentially confusing */}
            {/* If needed, it can be re-added with specific logic */}

            {/* Tanggal Survey */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Tanggal Survey
              </Label>
              <Input
                type="date"
                value={surveyDate}
                onChange={(e) => setSurveyDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Checklist Pemenuhan Berkas */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Checklist Pemenuhan Berkas
              </Label>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                {[
                  { key: "ktpPemohon", label: "KTP Pemohon" },
                  { key: "ktpPasangan", label: "KTP Pasangan" },
                  { key: "kartuKeluarga", label: "Kartu Keluarga" },
                  { key: "npwp", label: "NPWP" },
                  { key: "bkr", label: "BKR" },
                  { key: "livin", label: "Livin" },
                  { key: "rekTabungan", label: "Rekening Tabungan" },
                  { key: "mufApp", label: "MUF App" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={checklist[key as keyof OrderChecklist]}
                      onCheckedChange={(checked) =>
                        handleChecklistChange(key as keyof OrderChecklist, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Checklist terisi: {Object.values(checklist).filter(Boolean).length} / 8
              </p>
            </div>

            {/* Upload Foto Survey */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Foto Survey
              </Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="survey-photos"
                />
                <label htmlFor="survey-photos" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik untuk upload foto survey</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, atau WEBP</p>
                </label>
              </div>

              {surveyPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {surveyPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`Survey photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Foto terupload: {surveyPhotos.length}</p>
            </div>

            {/* Catatan */}
            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan proses..."
                value={surveyNote}
                onChange={(e) => setSurveyNote(e.target.value)}
              />
            </div>

            {/* Status Kelengkapan */}
            {isSurveyReadyForDecision ? (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Semua persyaratan terpenuhi!</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Anda dapat melanjutkan ke keputusan Map In atau Reject
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Lengkapi persyaratan untuk lanjut ke keputusan</span>
                </div>
                <ul className="text-sm text-amber-600 dark:text-amber-400 mt-2 space-y-1">
                  {surveyPhotos.length === 0 && <li>• Foto survey belum diupload</li>}
                  {!Object.values(checklist).every(Boolean) && (
                    <li>• Checklist berkas belum lengkap ({Object.values(checklist).filter(Boolean).length}/8)</li>
                  )}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Anda dapat menyimpan draft terlebih dahulu dan melanjutkan nanti
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSurveyDialog(false)}>
              Batal
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} disabled={processingAction}>
              {processingAction ? "Menyimpan..." : "Simpan Draft"}
            </Button>
            {isSurveyReadyForDecision && (
              <Button onClick={() => setShowMapInDialog(true)} className="bg-primary">
                Lanjut ke Keputusan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMapInDialog} onOpenChange={setShowMapInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user?.role === "cmh" ? "Keputusan Order" : "Keputusan Survey"}</DialogTitle>
            <DialogDescription>
              {user?.role === "cmh" 
                ? "Berikan keputusan final untuk order " 
                : "Ajukan order ke CMH untuk "}
              {selectedOrder?.namaNasabah}
            </DialogDescription>
          </DialogHeader>

          {/* CMH Dialog - Simplified with just Approve/Reject buttons */}
          {user?.role === "cmh" ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Berikan keputusan final: Approve untuk melanjutkan proses atau Reject untuk menolak order.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="default"
                  onClick={() => {
                    setCmhDecision("Approve")
                    setCmhNote("")
                    setShowCmhNoteDialog(true)
                  }}
                  disabled={processingAction || showCmhNoteDialog}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setCmhDecision("Reject")
                    setCmhNote("")
                    setShowCmhNoteDialog(true)
                  }}
                  disabled={processingAction || showCmhNoteDialog}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowMapInDialog(false)}>
                  Batal
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // CMO Dialog - Original with Map In / Reject dropdown
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Keputusan</Label>
                <Select value={mapInAction} onValueChange={(v) => setMapInAction(v as "Map In" | "Reject")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Map In">
                      <div className="flex flex-col">
                        <span>Map In</span>
                        <span className="text-xs text-muted-foreground">
                          Ajukan ke CMH untuk keputusan Approve/Reject
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Reject">
                      <div className="flex flex-col">
                        <span>Reject</span>
                        <span className="text-xs text-muted-foreground">Tolak order (keputusan final)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Info box based on selection */}
              <div
                className={`p-3 rounded-lg ${mapInAction === "Map In" ? "bg-blue-50 dark:bg-blue-950 border border-blue-200" : "bg-red-50 dark:bg-red-950 border border-red-200"}`}
              >
                <p
                  className={`text-sm ${mapInAction === "Map In" ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}
                >
                  {mapInAction === "Map In"
                    ? "Order akan dikirim ke CMH untuk keputusan final (Approve atau Reject)"
                    : "Order akan ditolak secara permanen"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Catatan {mapInAction === "Reject" && <span className="text-red-500">*</span>}</Label>
                <Textarea
                  placeholder={
                    mapInAction === "Map In" ? "Catatan untuk CMH (opsional)..." : "Berikan alasan penolakan..."
                  }
                  value={mapInNote}
                  onChange={(e) => setMapInNote(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowMapInDialog(false)}>
                  Batal
                </Button>
                <Button
                  onClick={handleMapInSubmit}
                  disabled={processingAction || (mapInAction === "Reject" && !mapInNote.trim())}
                  variant={mapInAction === "Reject" ? "destructive" : "default"}
                >
                  {processingAction ? "Memproses..." : mapInAction === "Map In" ? "Ajukan ke CMH" : "Reject Order"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CMH Note Input Dialog */}
      <Dialog open={showCmhNoteDialog} onOpenChange={setShowCmhNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cmhDecision === "Approve" ? "Keputusan Approve" : "Keputusan Reject"}
            </DialogTitle>
            <DialogDescription>
              Berikan catatan/alasan untuk keputusan {cmhDecision === "Approve" ? "approve" : "reject"} order{" "}
              {selectedOrder?.namaNasabah}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className={`p-3 rounded-lg ${
                cmhDecision === "Approve"
                  ? "bg-green-50 dark:bg-green-950 border border-green-200"
                  : "bg-red-50 dark:bg-red-950 border border-red-200"
              }`}
            >
              <p
                className={`text-sm ${
                  cmhDecision === "Approve"
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {cmhDecision === "Approve"
                  ? "Order akan disetujui dan melanjutkan proses"
                  : "Order akan ditolak secara permanen"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Catatan {cmhDecision === "Reject" && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                placeholder={
                  cmhDecision === "Approve"
                    ? "Catatan untuk approval (opsional)..."
                    : "Berikan alasan penolakan..."
                }
                value={cmhNote}
                onChange={(e) => setCmhNote(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Catatan akan tersimpan dalam riwayat order
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCmhNoteDialog(false)
                setCmhDecision(null)
                setCmhNote("")
              }}
            >
              Batal
            </Button>
            <Button
              onClick={async () => {
                if (cmhDecision === "Reject" && !cmhNote.trim()) {
                  toast({
                    title: "Error",
                    description: "Alasan penolakan harus diisi",
                    variant: "destructive",
                  })
                  return
                }

                setProcessingAction(true)
                try {
                  if (!selectedOrder) return

                  const noteText =
                    cmhDecision === "Approve"
                      ? `Keputusan MH: Approve${cmhNote ? " - " + cmhNote : ""}`
                      : `Keputusan MH: Reject - ${cmhNote}`

                  const newNotes = [
                    ...(selectedOrder.notes || []),
                    {
                      id: crypto.randomUUID(),
                      orderId: selectedOrder.id,
                      userId: user?.id || "",
                      userName: user?.namaLengkap || "Unknown",
                      role: user?.role,
                      note: noteText,
                      status: cmhDecision,
                      createdAt: new Date().toISOString(),
                    },
                  ]

                  await orderStore.update(selectedOrder.id, {
                    status: cmhDecision,
                    notes: newNotes,
                  })

                  toast({
                    title: "Berhasil",
                    description: `Order ${cmhDecision === "Approve" ? "disetujui" : "ditolak"}`,
                  })

                  setShowCmhNoteDialog(false)
                  setShowMapInDialog(false)
                  setCmhDecision(null)
                  setCmhNote("")
                  await loadOrders()
                } catch (error) {
                  console.error("Error processing CMH decision:", error)
                  toast({
                    title: "Error",
                    description: `Gagal ${cmhDecision === "Approve" ? "menyetujui" : "menolak"} order`,
                    variant: "destructive",
                  })
                } finally {
                  setProcessingAction(false)
                }
              }}
              disabled={processingAction || (cmhDecision === "Reject" && !cmhNote.trim())}
              variant={cmhDecision === "Reject" ? "destructive" : "default"}
            >
              {processingAction
                ? "Memproses..."
                : cmhDecision === "Approve"
                  ? "Setujui"
                  : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
