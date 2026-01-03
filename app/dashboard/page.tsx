"use client"

import { useEffect, useState, useCallback } from "react"
import { FileText, ClipboardList, CheckCircle2, XCircle, Clock } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { orderStore, userStore } from "@/lib/data-store"
import type { Order, OrderStatus, User } from "@/lib/types"
import { formatTanggal } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

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
          // SPV sees orders from sales under them
          const allOrders = await orderStore.getAll()
          const salesUnderSPV = await userStore.getByRole("sales")
          const salesIds = salesUnderSPV.filter((s: User) => s.spvId === user.id).map((s: User) => s.id)
          fetchedOrders = allOrders.filter((o) => salesIds.includes(o.salesId))
        } else if (user.role === "cmo") {
          fetchedOrders = await orderStore.getByCmoId(user.id)
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

  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const recentOrders = sortedOrders.slice(0, Math.min(sortedOrders.length, 10))

  const totalOrders = orders.length

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
            <CardDescription>Status semua order Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
              {(
                ["Baru", "Claim", "Cek Slik", "Proses", "Pertimbangkan", "Map In", "Approve", "Reject"] as OrderStatus[]
              ).map((status) => (
                <div key={status} className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                  <p className="text-xl md:text-2xl font-bold">{getStatusCount(status)}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">{status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders - With Sales/CMO names */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Order Terbaru</CardTitle>
            <CardDescription>
              {recentOrders.length} dari {totalOrders} order
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada order</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
