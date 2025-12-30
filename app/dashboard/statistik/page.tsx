"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { orderStore } from "@/lib/data-store"
import type { Order, OrderStatus } from "@/lib/types"
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        try {
          setLoading(true)
          let fetchedOrders: Order[] = []
          if (user.role === "sales") {
            fetchedOrders = await orderStore.getBySalesId(user.id)
          } else {
            fetchedOrders = await orderStore.getAll()
          }
          setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : [])
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
    loadOrders()
  }, [user])

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

  // Merk distribution
  const merkData = Object.entries(
    orders.reduce(
      (acc, order) => {
        acc[order.merk] = (acc[order.merk] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Statistik" description="Laporan dan metrik kinerja order" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Status Order</CardTitle>
              <CardDescription>Persentase order berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
                    <YAxis fontSize={12} />
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
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Merk */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Merk</CardTitle>
              <CardDescription>Merk dengan order terbanyak</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={merkData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
