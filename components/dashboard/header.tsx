"use client"

import { CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { IdCardDialog } from "@/components/dashboard/id-card-dialog"
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown"
import { useState } from "react"

interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { user } = useAuth()
  const [showIdCard, setShowIdCard] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="lg:pl-0 pl-12">
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowIdCard(true)}>
            <CreditCard className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">ID Card</span>
          </Button>

          <NotificationDropdown />
        </div>
      </div>

      {user && <IdCardDialog open={showIdCard} onOpenChange={setShowIdCard} user={user} />}
    </header>
  )
}
