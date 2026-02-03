"use client"

import { useEffect, useState, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { orderStore, userStore, dealerStore } from "@/lib/data-store"
import type { Order, OrderStatus, User, Dealer } from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const COLORS = ["#0ea5e9", "#f59e0b", "#f97316", "#06b6d4", "#8b5cf6", "#14b8a6", "#22c55e", "#ef4444"]

export default function StatistikPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [salesList, setSalesList] = useState<User[]>([])
  const [cmoList, setCmoList] = useState<User[]>([])
  const [dealerList, setDealerList] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [salesIdsUnderSPV, setSalesIdsUnderSPV] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const loadData = useCallback(async () => {
    if (user) {
      try {
        setLoading(true)
        let fetchedOrders: Order[] = []

        const allOrders = await orderStore.getAll()
        console.log("[v0] Statistik - allOrders count:", allOrders.length)
        console.log("[v0] Statistik - user:", {
          id: user.id,
          username: user.username,
          role: user.role,
          namaLengkap: user.namaLengkap,
        })

        if (user.role === "sales") {
          // Sales hanya melihat order miliknya
          fetchedOrders = allOrders.filter(
            (o: Order) =>
              o.salesId === user.id ||
              o.salesId === user.username ||
              o.salesName === user.namaLengkap ||
              o.salesName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
          )
          console.log("[v0] Statistik - sales filtered orders:", fetchedOrders.length)
        } else if (user.role === "cmo") {
          // CMO melihat order yang ditugaskan kepadanya
          fetchedOrders = allOrders.filter(
            (o: Order) =>
              o.cmoId === user.id ||
              o.cmoId === user.username ||
              o.cmoName === user.namaLengkap ||
              o.cmoName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
          )
          console.log("[v0] Statistik - cmo filtered orders:", fetchedOrders.length)
        } else if (user.role === "spv") {
          // SPV melihat order dari sales yang ditugaskan kepadanya
          const allSales = await userStore.getByRole("sales")
          console.log("[v0] Statistik - allSales count:", allSales.length)

          const salesUnderSPV = allSales.filter(
            (s: User) =>
              s.spvId === user.id ||
              s.spvId === user.username ||
              s.spvName === user.namaLengkap ||
              s.spvName?.toLowerCase() === user.namaLengkap?.toLowerCase(),
          )
          console.log(
            "[v0] Statistik - salesUnderSPV:",
            salesUnderSPV.map((s) => ({ id: s.id, nama: s.namaLengkap, spvId: s.spvId })),
          )

          const salesIds = salesUnderSPV.map((s: User) => s.id)
          const salesUsernames = salesUnderSPV.map((s: User) => s.username)
          const salesNames = salesUnderSPV.map((s: User) => s.namaLengkap?.toLowerCase())
          setSalesIdsUnderSPV(salesIds)

          fetchedOrders = allOrders.filter(
            (order: Order) =>
              salesIds.includes(order.salesId) ||
              salesUsernames.includes(order.salesId) ||
              salesNames.includes(order.salesName?.toLowerCase()),
          )
          console.log("[v0] Statistik - spv filtered orders:", fetchedOrders.length)
        } else {
          // Admin dan CMH melihat semua order
          fetchedOrders = allOrders
        }

        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : [])

        const sales = await userStore.getByRole("sales")
        setSalesList(Array.isArray(sales) ? sales : [])

        const cmos = await userStore.getByRole("cmo")
        setCmoList(Array.isArray(cmos) ? cmos : [])

        const dealers = await dealerStore.getAll()
        setDealerList(Array.isArray(dealers) ? dealers : [])
      } catch (error) {
        console.error("Error loading orders:", error)
        setOrders([])
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter orders berdasarkan bulan dan tahun yang dipilih
  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt)
    return orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear
  })

  // Dapatkan tahun-tahun unik dari orders
  const availableYears = Array.from(
    new Set(
      orders.map((order) => {
        const date = new Date(order.createdAt)
        return date.getFullYear()
      }),
    ),
  ).sort((a, b) => b - a)

  if (!user) return null

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Statistik" description="Laporan dan metrik kinerja order" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  const statusData: { name: string; value: number }[] = (
    ["Baru", "Claim", "Cek Slik", "Proses", "Pertimbangkan", "Map In", "Approve", "Reject"] as OrderStatus[]
  ).map((status) => ({
    name: status,
    value: filteredOrders.filter((o) => o.status === status).length,
  }))

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const month = date.toLocaleString("id-ID", { month: "short" })
    const year = date.getFullYear()
    const monthOrders = filteredOrders.filter((o) => {
      const orderDate = new Date(o.createdAt)
      return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear()
    })
    return {
      name: `${month} ${year}`,
      total: monthOrders.length,
      approve: monthOrders.filter((o) => o.status === "Approve").length,
      reject: monthOrders.filter((o) => o.status === "Reject").length,
    }
  })

  const getTopChartData = () => {
    if (user.role === "cmo") {
      return {
        title: "Top 5 Sales",
        description: "Sales dengan order terbanyak",
        data: salesList
          .map((sales) => ({
            name: sales.namaLengkap,
            value: filteredOrders.filter((o) => o.salesId === sales.id).length,
          }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      }
    } else if (user.role === "cmh" || user.role === "admin") {
      const dealerCounts: Record<string, number> = {}
      filteredOrders.forEach((order) => {
        if (order.dealer) {
          dealerCounts[order.dealer] = (dealerCounts[order.dealer] || 0) + 1
        }
      })

      return {
        title: "Top 5 Dealer",
        description: "Dealer dengan order terbanyak",
        data: Object.entries(dealerCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      }
    } else if (user.role === "spv") {
      const cmoCounts: Record<string, number> = {}
      filteredOrders.forEach((order) => {
        if (order.cmoName) {
          cmoCounts[order.cmoName] = (cmoCounts[order.cmoName] || 0) + 1
        }
      })

      return {
        title: "Top 5 CMO",
        description: "CMO dengan order terbanyak (dari Sales Anda)",
        data: Object.entries(cmoCounts)
          .map(([name, value]) => ({ name, value }))
          .filter((d) => d.name && d.name.trim() !== "")
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      }
    } else {
      const cmoCounts: Record<string, number> = {}
      filteredOrders.forEach((order) => {
        if (order.cmoName) {
          cmoCounts[order.cmoName] = (cmoCounts[order.cmoName] || 0) + 1
        }
      })

      return {
        title: "Top 5 CMO",
        description: "CMO dengan order terbanyak",
        data: Object.entries(cmoCounts)
          .map(([name, value]) => ({ name, value }))
          .filter((d) => d.name && d.name.trim() !== "")
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      }
    }
  }

  const topChartConfig = getTopChartData()

  const hasData = filteredOrders.length > 0
  const hasStatusData = statusData.some((d) => d.value > 0)

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Statistik" description="Laporan dan metrik kinerja order" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Bulan</label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tahun</label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.length > 0 ? (
                  availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={selectedYear.toString()} disabled>
                    {selectedYear}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSelectedMonth(new Date().getMonth())
              setSelectedYear(new Date().getFullYear())
            }}
          >
            Reset
          </Button>
        </div>
        {!hasData && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Belum ada data order untuk ditampilkan</p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Status Order</CardTitle>
              <CardDescription>Persentase order berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {hasStatusData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Tidak ada data</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tren Order Bulanan</CardTitle>
              <CardDescription>Jumlah order per bulan (6 bulan terakhir)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="approve" stroke="#22c55e" strokeWidth={2} name="Approve" />
                    <Line type="monotone" dataKey="reject" stroke="#ef4444" strokeWidth={2} name="Reject" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Jumlah Order Per Status</CardTitle>
              <CardDescription>Distribusi order berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={80} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{topChartConfig.title}</CardTitle>
              <CardDescription>{topChartConfig.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {topChartConfig.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topChartConfig.data} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" fontSize={12} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Tidak ada data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Order</p>
              <p className="text-3xl font-bold">{filteredOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approval Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {filteredOrders.length > 0
                  ? ((filteredOrders.filter((o) => o.status === "Approve").length / filteredOrders.length) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Reject Rate</p>
              <p className="text-3xl font-bold text-red-600">
                {filteredOrders.length > 0
                  ? ((filteredOrders.filter((o) => o.status === "Reject").length / filteredOrders.length) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-amber-600">
                {filteredOrders.filter((o) => !["Approve", "Reject"].includes(o.status)).length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
