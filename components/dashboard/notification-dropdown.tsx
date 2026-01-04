"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Bell, Check, CheckCheck, X, FileText, AlertCircle, CheckCircle2, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/app/actions/notification-actions"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { useRouter } from "next/navigation"

export function NotificationDropdown() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const isMounted = useRef(true)
  const isLoadingRef = useRef(false)

  const loadNotifications = useCallback(async () => {
    if (!user?.id || isLoadingRef.current) return

    isLoadingRef.current = true

    try {
      const [notifList, count] = await Promise.all([getNotifications(user.id), getUnreadNotificationCount(user.id)])

      if (isMounted.current) {
        const validNotifs = Array.isArray(notifList) ? notifList : []
        const validCount = typeof count === "number" && count >= 0 ? count : 0

        setNotifications(validNotifs)
        setUnreadCount(validCount)
        setHasLoaded(true)
        setLoading(false)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
      if (isMounted.current) {
        setHasLoaded(true)
        setLoading(false)
      }
    } finally {
      isLoadingRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    isMounted.current = true

    setNotifications([])
    setUnreadCount(0)
    setHasLoaded(false)
    setLoading(true)

    if (!user?.id) {
      setLoading(false)
      return
    }

    const initialTimeout = setTimeout(() => {
      if (isMounted.current) {
        loadNotifications()
      }
    }, 3000)

    const interval = setInterval(() => {
      if (isMounted.current && !isLoadingRef.current) {
        loadNotifications()
      }
    }, 300000) // 5 minutes

    return () => {
      isMounted.current = false
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [user?.id, loadNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    if (notification.referenceId) {
      if (notification.type === "activity") {
        router.push("/dashboard/aktivitas")
      } else {
        router.push("/dashboard/tracking")
      }
    }
    setIsOpen(false)
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order_new":
        return <FileText className="h-4 w-4 text-blue-500" />
      case "slik_result":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "order_approve":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "order_reject":
        return <X className="h-4 w-4 text-red-500" />
      case "activity":
        return <Activity className="h-4 w-4 text-purple-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: id })
    } catch {
      return ""
    }
  }

  if (!user) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasLoaded && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-3 w-3 mr-1" />
              Tandai Semua Dibaca
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-primary/5",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm line-clamp-1", !notification.isRead && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
