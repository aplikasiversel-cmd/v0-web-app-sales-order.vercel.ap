"use client"

import { useEffect, useState, useCallback } from "react"
import { FileText, ClipboardList, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, X } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { orderStore, userStore } from "@/lib/data-store"
import type { Order, OrderStatus, User } from "@/lib/types"
import { formatTanggal } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const ITEMS_PER_PAGE = 5

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null)

  const isSales = user?.role === "sales"
  const isSPV = user?.role === "spv"
  const isCMO = user?.role === "cmo"
  const isCMH = user?.role === "cmh"
  const isAdmin = user?.role === "admin"

  const loadOrders = useCallback(async () => {
    if (user) {
      setLoading(true)
      try {
        let fetchedOrders: Order[] = []

        if (user.role === "sales") {
          fetchedOrders = await orderStore.getBySalesId(user.id)
        } else if (user.role === "spv") {
          // SPV sees orders from sales under them AND orders they input themselves
          const allOrders = await orderStore.getAll()
          const allSales = await userStore.getByRole("sales")

          // Find sales assigned to this SPV
          const salesUnderSPV = allSales.filter(
            (s: User) =>
              s.spvId === user.id ||
              s.spvId === user.username ||
              s.spvName === user.namaLengkap ||
              s.spvName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
          )

          const salesIds = salesUnderSPV.map((s: User) => s.id)
          const salesUsernames = salesUnderSPV.map((s: User) => s.username)
          const salesNames = salesUnderSPV.map((s: User) => s.namaLengkap?.toLowerCase())

          // Filter orders: from sales under SPV OR directly input by SPV themselves
          fetchedOrders = allOrders.filter(
            (o: Order) =>
              // Orders from sales under SPV
              salesIds.includes(o.salesId) ||
              salesUsernames.includes(o.salesId) ||
              salesNames.includes(o.salesName?.toLowerCase()) ||
              // Orders that SPV input themselves
              o.salesId === user.id ||
              o.salesId === user.username ||
              o.salesName === user.namaLengkap ||
              o.salesName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
          )
        } else if (user.role === "cmo") {
          const allOrders = await orderStore.getAll()
          const ordersArray = Array.isArray(allOrders) ? allOrders : []
          fetchedOrders = ordersArray.filter((o) => {
            // Match by ID
            if (o.cmoId === user.id) return true
            // Match by username (some orders may store username as cmoId)
            if (o.cmoId === user.username) return true
            // Match by name
            if (o.cmoName && o.cmoName.toUpperCase() === user.namaLengkap.toUpperCase()) return true
            return false
          })
        } else if (user.role === "cmh") {
          fetchedOrders = await orderStore.getAll()
        } else {
          // Admin sees all orders
          fetchedOrders = await orderStore.getAll()
        }

        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : [])
      } catch (error) {
        console.error("Error loading orders:", error)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    setCurrentPage(1)
  }, [orders.length])

  if (!user) return null

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader
          title={`Selamat Datang, ${user.namaLengkap}`}
          description={`Dashboard ${user.role.toUpperCase()}`}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  const getStatusCount = (status: OrderStatus) => orders.filter((o) => o.status === status).length

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

  const filteredByStatus = selectedStatus ? orders.filter((o) => o.status === selectedStatus) : orders

  const sortedOrders = [...filteredByStatus].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const totalOrders = filteredByStatus.length
  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedOrders = sortedOrders.slice(startIndex, endIndex)

  const handleStatusClick = (status: OrderStatus) => {
    if (selectedStatus === status) {
      setSelectedStatus(null) // Toggle off if already selected
    } else {
      setSelectedStatus(status)
    }
    setCurrentPage(1) // Reset to first page when filter changes
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title={`Selamat Datang, ${user.namaLengkap}`}
        description={`Dashboard ${user.role.toUpperCase()}`}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Total Order"
            value={totalOrders}
            icon={FileText}
            iconClassName="bg-primary text-primary-foreground"
          />
          <StatsCard
            title="Order Baru"
            value={getStatusCount("Baru")}
            icon={Clock}
            iconClassName="bg-blue-500 text-white"
          />
          <StatsCard
            title="Disetujui"
            value={getStatusCount("Approve")}
            icon={CheckCircle2}
            iconClassName="bg-green-500 text-white"
          />
          <StatsCard
            title="Ditolak"
            value={getStatusCount("Reject")}
            icon={XCircle}
            iconClassName="bg-red-500 text-white"
          />
        </div>

        {/* Status Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ringkasan Status Order</CardTitle>
            <CardDescription>
              {selectedStatus ? `Filter aktif: ${selectedStatus}` : "Status semua order Anda - Klik untuk filter"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
              {(
                ["Baru", "Claim", "Cek Slik", "Proses", "Pertimbangkan", "Map In", "Approve", "Reject"] as OrderStatus[]
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusClick(status)}
                  className={cn(
                    "text-center p-2 md:p-3 rounded-lg transition-all cursor-pointer",
                    "hover:ring-2 hover:ring-primary/50 hover:bg-muted",
                    selectedStatus === status ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50",
                  )}
                >
                  <p className="text-xl md:text-2xl font-bold">{getStatusCount(status)}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">{status}</p>
                </button>
              ))}
            </div>
            {selectedStatus && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStatus(null)
                    setCurrentPage(1)
                  }}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Hapus Filter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders - With Pagination */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{selectedStatus ? `Order ${selectedStatus}` : "Order Terbaru"}</CardTitle>
            <CardDescription>
              Menampilkan {paginatedOrders.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, totalOrders)} dari{" "}
              {totalOrders} order
              {selectedStatus && ` (Filter: ${selectedStatus})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{selectedStatus ? `Tidak ada order dengan status ${selectedStatus}` : "Belum ada order"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{order.namaNasabah}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.merk} - {order.typeUnit}
                      </p>
                      {(isCMO || isCMH || isAdmin) && order.salesName && (
                        <p className="text-xs text-blue-600">Sales: {order.salesName}</p>
                      )}
                      {(isSales || isSPV || isCMH || isAdmin) && order.cmoName && (
                        <p className="text-xs text-green-600">CMO: {order.cmoName}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-xs text-muted-foreground">{formatTanggal(order.createdAt)}</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
