"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Download, Upload, Database, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  const handleExportBackup = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Fetch all data from API
      setExportProgress(10)
      const response = await fetch("/api/backup/export")

      if (!response.ok) {
        throw new Error("Failed to export data")
      }

      setExportProgress(70)
      const data = await response.json()

      // Create backup file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: data,
      }

      setExportProgress(90)

      // Download as JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `muf-backup-${timestamp}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportProgress(100)
      setLastBackup(new Date().toLocaleString("id-ID"))
      toast.success("Backup berhasil di-download!")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Gagal export backup")
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 1000)
    }
  }

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    try {
      const text = await file.text()
      const backupData = JSON.parse(text)

      if (!backupData.data || !backupData.version) {
        throw new Error("Invalid backup file format")
      }

      const response = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData.data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to import data")
      }

      toast.success("Data berhasil di-restore dari backup!")
    } catch (error) {
      console.error("Import error:", error)
      toast.error(error instanceof Error ? error.message : "Gagal import backup")
    } finally {
      setIsImporting(false)
      // Reset file input
      event.target.value = ""
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
        <p className="text-muted-foreground">Kelola backup database aplikasi</p>
      </div>

      <div className="grid gap-6">
        {/* Info Card */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Informasi Backup</AlertTitle>
          <AlertDescription>
            Backup akan menyimpan semua data: Users, Programs, Dealers, Orders, Simulasi, dan Aktivitas. File backup
            dalam format JSON dan bisa di-upload ke Google Drive secara manual.
          </AlertDescription>
        </Alert>

        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Backup
            </CardTitle>
            <CardDescription>Download seluruh data database sebagai file JSON</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportProgress > 0 && (
              <div className="space-y-2">
                <Progress value={exportProgress} />
                <p className="text-sm text-muted-foreground">
                  {exportProgress < 100 ? "Mengexport data..." : "Selesai!"}
                </p>
              </div>
            )}

            <Button onClick={handleExportBackup} disabled={isExporting} className="w-full md:w-auto">
              {isExporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Mengexport...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Backup
                </>
              )}
            </Button>

            {lastBackup && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Backup terakhir: {lastBackup}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore dari Backup
            </CardTitle>
            <CardDescription>Import data dari file backup JSON sebelumnya</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Peringatan</AlertTitle>
              <AlertDescription>
                Restore akan menambahkan data dari backup. Data yang sudah ada dengan ID yang sama akan di-skip.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                disabled={isImporting}
                className="hidden"
                id="backup-file"
              />
              <Button
                variant="outline"
                disabled={isImporting}
                onClick={() => document.getElementById("backup-file")?.click()}
                className="w-full md:w-auto"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Mengimport...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Pilih File Backup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Drive Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Simpan ke Google Drive</CardTitle>
            <CardDescription>Cara menyimpan backup ke Google Drive secara manual</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Klik tombol "Download Backup" di atas</li>
              <li>
                Buka{" "}
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Google Drive
                </a>
              </li>
              <li>
                Login dengan email: <strong>aplikasiversel@gmail.com</strong>
              </li>
              <li>Drag & drop file backup ke Google Drive</li>
              <li>Atau klik "New" → "File upload" dan pilih file backup</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
