import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react"
import type { OrderStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface OrderTimelineProps {
  currentStatus: OrderStatus
}

const STATUS_FLOW: { status: OrderStatus; label: string }[] = [
  { status: "Baru", label: "Baru" },
  { status: "Claim", label: "Claim" },
  { status: "Cek Slik", label: "Cek SLIK" },
  { status: "Proses", label: "Proses" },
  { status: "Map In", label: "Map In" },
  { status: "Approve", label: "Approve" },
]

const getStatusIndex = (status: OrderStatus): number => {
  if (status === "Reject") return -1
  if (status === "Pertimbangkan") return 3 // After Cek Slik
  return STATUS_FLOW.findIndex((s) => s.status === status)
}

export function OrderTimeline({ currentStatus }: OrderTimelineProps) {
  const currentIndex = getStatusIndex(currentStatus)
  const isRejected = currentStatus === "Reject"
  const isPertimbangkan = currentStatus === "Pertimbangkan"

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STATUS_FLOW.map((item, index) => {
          const isCompleted = currentIndex > index
          const isCurrent = currentIndex === index
          const isUpcoming = currentIndex < index

          return (
            <div key={item.status} className="flex flex-col items-center flex-1">
              <div className="relative flex items-center justify-center w-full">
                {/* Connector Line Before */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute right-1/2 h-0.5 w-full -z-10",
                      isCompleted || isCurrent ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
                {/* Connector Line After */}
                {index < STATUS_FLOW.length - 1 && (
                  <div
                    className={cn("absolute left-1/2 h-0.5 w-full -z-10", isCompleted ? "bg-primary" : "bg-muted")}
                  />
                )}

                {/* Status Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background z-10",
                    isCompleted && "border-primary bg-primary",
                    isCurrent && !isRejected && "border-primary",
                    isUpcoming && "border-muted",
                    isRejected && isCurrent && "border-destructive bg-destructive",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                  ) : isCurrent ? (
                    isRejected ? (
                      <XCircle className="h-5 w-5 text-destructive-foreground" />
                    ) : (
                      <Clock className="h-5 w-5 text-primary" />
                    )
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs mt-2 text-center",
                  isCompleted && "text-primary font-medium",
                  isCurrent && !isRejected && "text-primary font-medium",
                  isUpcoming && "text-muted-foreground",
                  isRejected && isCurrent && "text-destructive font-medium",
                )}
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Special Status Indicators */}
      {isRejected && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Order Ditolak</span>
          </div>
        </div>
      )}

      {isPertimbangkan && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Dalam Pertimbangan CMH</span>
          </div>
        </div>
      )}

      {currentStatus === "Approve" && (
        <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Order Disetujui</span>
          </div>
        </div>
      )}
    </div>
  )
}
