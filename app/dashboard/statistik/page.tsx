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

const COLORS = ["#0ea5e9", "#f59e0b", "#f97316", "#06b6d4", "#8b5cf6", "#14b8a6", "#22c55e", "#ef4444"]

export default function StatistikPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [salesList, setSalesList] = useState<User[]>([])
  const [cmoList, setCmoList] = useState<User[]>([])
  const [dealerList, setDealerList] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (user) {
      try {
        setLoading(true)
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
          // CMO sees orders assigned to them
          fetchedOrders = await orderStore.getByCmoId(user.id)
        } else if (user.role === "cmh") {
          fetchedOrders = await orderStore.getAll()
        } else {
          // Admin sees all
          fetchedOrders = await orderStore.getAll()
        }

        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : [])

        // Load sales list
        const sales = await userStore.getByRole("sales")
        setSalesList(Array.isArray(sales) ? sales : [])

        // Load CMO list
        const cmos = await userStore.getByRole("cmo")
        setCmoList(Array.isArray(cmos) ? cmos : [])

        // Load dealer list
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

  // Status distribution data
  const statusData: { name: string; value: number }[] = (
    ["Baru", "Claim", "Cek Slik", "Proses", "Pertimbangkan", "Map In", "Approve", "Reject"] as OrderStatus[]
  ).map((status) => ({
    name: status,
    value: orders.filter((o) => o.status === status).length,
  }))

  // Monthly data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const month = date.toLocaleString("id-ID", { month: "short" })
    const year = date.getFullYear()
    const monthOrders = orders.filter((o) => {
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
      // CMO sees Top 5 Sales
      return {
        title: "Top 5 Sales",
        description: "Sales dengan order terbanyak",
        data: salesList
          .map((sales) => ({
            name: sales.namaLengkap,
            value: orders.filter((o) => o.salesId === sales.id).length,
          }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      }
    } else if (user.role === "cmh" || user.role === "admin") {
      return {
        title: "Top 5 Dealer",
        description: "Dealer dengan order terbanyak",
        data: dealerList
          .map((dealer) => ({
            name: dealer.namaDealer,
            value: orders.filter((o) => o.dealer === dealer.namaDealer).length,
          }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      }
    } else {
      // Sales, SPV sees Top 5 CMO
      return {
        title: "Top 5 CMO",
        description: "CMO dengan order terbanyak",
        data: cmoList
          .map((cmo) => ({
            name: cmo.namaLengkap,
            value: orders.filter((o) => o.cmoId === cmo.id).length,
          }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      }
    }
  }

  const topChartConfig = getTopChartData()

  const hasData = orders.length > 0
  const hasStatusData = statusData.some((d) => d.value > 0)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Statistik" description="Laporan dan metrik kinerja order" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {!hasData && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Belum ada data order untuk ditampilkan</p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
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

          {/* Monthly Trend */}
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

          {/* Status Bar Chart */}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Order</p>
              <p className="text-3xl font-bold">{orders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approval Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {orders.length > 0
                  ? ((orders.filter((o) => o.status === "Approve").length / orders.length) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Reject Rate</p>
              <p className="text-3xl font-bold text-red-600">
                {orders.length > 0
                  ? ((orders.filter((o) => o.status === "Reject").length / orders.length) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-amber-600">
                {orders.filter((o) => !["Approve", "Reject"].includes(o.status)).length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
