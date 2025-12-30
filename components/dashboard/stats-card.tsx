import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  iconClassName?: string
}

export function StatsCard({ title, value, icon: Icon, description, trend, className, iconClassName }: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn("text-xs font-medium", trend.isPositive ? "text-green-600" : "text-red-600")}>
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}% dari bulan lalu
              </p>
            )}
          </div>
          <div
            className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconClassName || "bg-primary/10")}
          >
            <Icon className={cn("h-5 w-5", iconClassName ? "text-white" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
