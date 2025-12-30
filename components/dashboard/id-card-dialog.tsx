"use client"

import { useRef } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { User } from "@/lib/types"
import { formatTanggal } from "@/lib/utils/format"

interface IdCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function IdCardDialog({ open, onOpenChange, user }: IdCardDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    const canvas = document.createElement("canvas")
    const scale = 2
    const width = 340
    const height = 200

    canvas.width = width * scale
    canvas.height = height * scale

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      alert("Gagal membuat canvas")
      return
    }

    ctx.scale(scale, scale)

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, "#0369a1")
    gradient.addColorStop(0.5, "#0ea5e9")
    gradient.addColorStop(1, "#38bdf8")

    // Rounded rectangle background
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, 12)
    ctx.fillStyle = gradient
    ctx.fill()

    // Helper function to draw rounded rect
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, color: string) => {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
      ctx.fillStyle = color
      ctx.fill()
    }

    // Padding
    const padding = 16

    // Logo box
    drawRoundedRect(padding, padding, 40, 40, 8, "rgba(255,255,255,0.2)")
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 18px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("M", padding + 20, padding + 20)

    // Company name
    ctx.textAlign = "left"
    ctx.font = "bold 14px system-ui, sans-serif"
    ctx.fillStyle = "#ffffff"
    ctx.fillText("MANDIRI UTAMA FINANCE", padding + 48, padding + 16)
    ctx.font = "12px system-ui, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.fillText("MUF Order System", padding + 48, padding + 32)

    // ID
    ctx.textAlign = "right"
    ctx.font = "12px system-ui, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.fillText("ID", width - padding, padding + 12)
    ctx.font = "12px monospace"
    ctx.fillStyle = "#ffffff"
    ctx.fillText(user.id.slice(0, 8).toUpperCase(), width - padding, padding + 28)

    // Avatar box
    const avatarY = 72
    drawRoundedRect(padding, avatarY, 64, 64, 8, "rgba(255,255,255,0.2)")
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 24px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(user.namaLengkap.charAt(0), padding + 32, avatarY + 36)

    // User info
    ctx.textAlign = "left"
    ctx.font = "bold 18px system-ui, sans-serif"
    ctx.fillStyle = "#ffffff"
    const maxNameWidth = width - padding - 64 - padding - 16
    let displayName = user.namaLengkap
    while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 0) {
      displayName = displayName.slice(0, -1)
    }
    if (displayName !== user.namaLengkap) displayName += "..."
    ctx.fillText(displayName, padding + 80, avatarY + 20)

    // Role
    const getRoleTitle = () => {
      switch (user.role) {
        case "admin":
          return "Administrator"
        case "cmh":
          return "Credit Marketing Head"
        case "cmo":
          return "Credit Marketing Officer"
        default:
          return "Sales Marketing"
      }
    }
    ctx.font = "14px system-ui, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.fillText(getRoleTitle(), padding + 80, avatarY + 40)

    // Username
    ctx.font = "12px monospace"
    ctx.fillStyle = "rgba(255,255,255,0.7)"
    ctx.fillText(`@${user.username}`, padding + 80, avatarY + 58)

    // Bottom separator line
    const bottomY = height - 48
    ctx.beginPath()
    ctx.moveTo(padding, bottomY)
    ctx.lineTo(width - padding, bottomY)
    ctx.strokeStyle = "rgba(255,255,255,0.2)"
    ctx.lineWidth = 1
    ctx.stroke()

    // Bottom left - Merk & Dealer
    ctx.textAlign = "left"
    ctx.font = "12px system-ui, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    if (user.merk) {
      ctx.fillText(`Merk: ${user.merk}`, padding, bottomY + 18)
    }
    if (user.dealer) {
      let displayDealer = user.dealer
      while (ctx.measureText(displayDealer).width > 180 && displayDealer.length > 0) {
        displayDealer = displayDealer.slice(0, -1)
      }
      if (displayDealer !== user.dealer) displayDealer += "..."
      ctx.fillText(displayDealer, padding, bottomY + 34)
    }

    // Bottom right - Join date
    ctx.textAlign = "right"
    ctx.fillStyle = "rgba(255,255,255,0.6)"
    ctx.fillText("Bergabung", width - padding, bottomY + 18)
    ctx.fillStyle = "#ffffff"
    ctx.fillText(formatTanggal(user.createdAt), width - padding, bottomY + 34)

    // Download
    const link = document.createElement("a")
    link.download = `ID_Card_${user.namaLengkap.replace(/\s+/g, "_")}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const getRoleTitle = () => {
    switch (user.role) {
      case "admin":
        return "Administrator"
      case "cmh":
        return "Credit Marketing Head"
      case "cmo":
        return "Credit Marketing Officer"
      default:
        return "Sales Marketing"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            ID Card
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center p-4">
          <div
            ref={cardRef}
            style={{
              width: "340px",
              height: "200px",
              borderRadius: "12px",
              overflow: "hidden",
              background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #38bdf8 100%)",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <div
              style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px", color: "#ffffff" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      height: "40px",
                      width: "40px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "18px", color: "#ffffff" }}>M</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0, color: "#ffffff" }}>
                      MANDIRI UTAMA FINANCE
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: 0 }}>MUF Order System</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: 0 }}>ID</p>
                  <p style={{ fontFamily: "monospace", fontSize: "12px", margin: 0, color: "#ffffff" }}>
                    {user.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "16px", marginTop: "12px" }}>
                <div
                  style={{
                    height: "64px",
                    width: "64px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "24px", color: "#ffffff" }}>
                    {user.namaLengkap.charAt(0)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: "bold",
                      fontSize: "18px",
                      margin: 0,
                      color: "#ffffff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.namaLengkap}
                  </p>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: 0 }}>{getRoleTitle()}</p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.7)",
                      fontFamily: "monospace",
                      marginTop: "4px",
                    }}
                  >
                    @{user.username}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginTop: "auto",
                  paddingTop: "8px",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div>
                  {user.merk && (
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: 0 }}>Merk: {user.merk}</p>
                  )}
                  {user.dealer && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.8)",
                        margin: 0,
                        maxWidth: "180px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user.dealer}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: 0 }}>Bergabung</p>
                  <p style={{ fontSize: "12px", margin: 0, color: "#ffffff" }}>{formatTanggal(user.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
