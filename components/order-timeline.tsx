import type { OrderStatus } from "@/lib/types"
import { CheckCircle2, Circle, Clock } from "lucide-react"

interface OrderTimelineProps {
  currentStatus: OrderStatus
  passedStatuses: OrderStatus[]
  timestamps?: Record<string, string>
}

const STATUS_ORDER: OrderStatus[] = ["Baru", "Claim", "Cek Slik", "Proses", "Map In", "Approve"]

export function OrderTimeline({ currentStatus, passedStatuses, timestamps = {} }: OrderTimelineProps) {
  const isRejected = currentStatus === "Reject"
  const isPertimbangan = currentStatus === "Pertimbangkan"

  const getStatusIcon = (status: OrderStatus) => {
    if (passedStatuses.includes(status)) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    }
    if (status === currentStatus) {
      return <Clock className="h-5 w-5 text-primary animate-pulse" />
    }
    return <Circle className="h-5 w-5 text-muted-foreground" />
  }

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return null
    try {
      return new Date(isoString).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return null
    }
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">Status Timeline</p>
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-muted" />
        <div
          className="absolute top-3 left-0 h-0.5 bg-green-500 transition-all"
          style={{
            width: `${(passedStatuses.length / STATUS_ORDER.length) * 100}%`,
          }}
        />

        {STATUS_ORDER.map((status, index) => (
          <div key={status} className="relative flex flex-col items-center z-10">
            <div className="bg-background p-1 rounded-full">{getStatusIcon(status)}</div>
            <span
              className={`text-xs mt-1 ${
                passedStatuses.includes(status) ? "text-green-600 font-medium" : "text-muted-foreground"
              }`}
            >
              {status}
            </span>
            {timestamps[status] && (
              <span className="text-[10px] text-muted-foreground">{formatTimestamp(timestamps[status])}</span>
            )}
          </div>
        ))}
      </div>

      {isRejected && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600 font-medium">Order Ditolak (Reject)</p>
          {timestamps["Reject"] && <p className="text-xs text-red-500">{formatTimestamp(timestamps["Reject"])}</p>}
        </div>
      )}

      {isPertimbangan && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-600 font-medium">Order Dalam Pertimbangan</p>
          {timestamps["Pertimbangkan"] && (
            <p className="text-xs text-amber-500">{formatTimestamp(timestamps["Pertimbangkan"])}</p>
          )}
        </div>
      )}
    </div>
  )
}
