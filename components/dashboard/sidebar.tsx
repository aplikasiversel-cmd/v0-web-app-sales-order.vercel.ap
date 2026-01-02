"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Calculator,
  FileText,
  ClipboardList,
  BarChart3,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  Activity,
  Home,
  Download,
  Database,
  Flame,
  UserCog,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import type { UserRole } from "@/lib/types"
import { useState } from "react"
import { NotificationDropdown } from "./notification-dropdown"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["sales", "spv", "cmo", "cmh", "admin"],
  },
  {
    title: "Simulasi Kredit",
    href: "/dashboard/simulasi",
    icon: Calculator,
    roles: ["sales", "spv", "cmo", "cmh"],
  },
  {
    title: "Form Order",
    href: "/dashboard/order/new",
    icon: FileText,
    roles: ["sales", "spv"],
  },
  {
    title: "Tracking Order",
    href: "/dashboard/tracking",
    icon: ClipboardList,
    roles: ["sales", "spv", "cmo", "cmh"],
  },
  {
    title: "Aktivitas",
    href: "/dashboard/aktivitas",
    icon: Activity,
    roles: ["cmo", "cmh"],
  },
  {
    title: "Laporan Bulanan",
    href: "/dashboard/laporan",
    icon: Download,
    roles: ["cmh"],
  },
  {
    title: "Statistik",
    href: "/dashboard/statistik",
    icon: BarChart3,
    roles: ["sales", "spv", "cmo", "cmh"],
  },
  {
    title: "Kelola Sales",
    href: "/dashboard/admin/sales",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Kelola SPV",
    href: "/dashboard/admin/spv",
    icon: UserCog,
    roles: ["admin"],
  },
  {
    title: "Kelola CMO/CMH",
    href: "/dashboard/admin/cmo",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Kelola Program",
    href: "/dashboard/admin/program",
    icon: CreditCard,
    roles: ["admin"],
  },
  {
    title: "Kelola Dealer",
    href: "/dashboard/admin/dealer",
    icon: Building2,
    roles: ["admin"],
  },
  {
    title: "Backup Data",
    href: "/dashboard/admin/backup",
    icon: Database,
    roles: ["admin"],
  },
  {
    title: "Firebase Setup",
    href: "/dashboard/admin/firebase-setup",
    icon: Flame,
    roles: ["admin"],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role))

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700"
      case "cmh":
        return "bg-amber-100 text-amber-700"
      case "cmo":
        return "bg-blue-100 text-blue-700"
      case "spv":
        return "bg-teal-100 text-teal-700"
      default:
        return "bg-green-100 text-green-700"
    }
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">MUF Order System</h2>
            <p className="text-xs text-muted-foreground truncate">Mandiri Utama Finance</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-secondary-foreground font-medium text-sm">
              {user.namaLengkap.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.namaLengkap}</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full", getRoleBadgeColor(user.role))}>
              {user.role.toUpperCase()}
            </span>
          </div>
          <NotificationDropdown />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Settings className="h-5 w-5" />
          <span>Pengaturan</span>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Keluar</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-transparent"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 lg:hidden flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>
    </>
  )
}
