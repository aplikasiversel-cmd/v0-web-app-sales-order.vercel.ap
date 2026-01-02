"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Database, CheckCircle, Loader2, AlertCircle } from "lucide-react"

export default function FirebaseSetupPage() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { toast } = useToast()

  const handleInitialize = async () => {
    setIsInitializing(true)
    try {
      const response = await fetch("/api/firebase/init", { method: "POST" })
      const data = await response.json()

      if (data.success) {
        setIsInitialized(true)
        toast({
          title: "Berhasil",
          description: "Firebase berhasil diinisialisasi dengan data default",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menginisialisasi Firebase",
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Setup Firebase</h1>
        <p className="text-muted-foreground">Inisialisasi database Firebase untuk aplikasi</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Status Database
            </CardTitle>
            <CardDescription>Status koneksi Firebase Firestore</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Firebase Terhubung</p>
                  <p className="text-sm text-green-600">Project: mufos2</p>
                </div>
              </div>

              {isInitialized && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Data Default Tersedia</p>
                    <p className="text-sm text-blue-600">Admin user dan merk default telah dibuat</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inisialisasi Data</CardTitle>
            <CardDescription>Setup data default untuk aplikasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Data yang akan dibuat:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- Admin user (admin / Admin@123)</li>
                  <li>- 16 merk default (Honda, Toyota, dll)</li>
                </ul>
              </div>

              <Button onClick={handleInitialize} disabled={isInitializing} className="w-full">
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menginisialisasi...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Inisialisasi Firebase
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    Klik tombol di atas untuk membuat data default. Data yang sudah ada tidak akan diganti.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informasi Firebase</CardTitle>
          <CardDescription>Detail konfigurasi Firebase yang digunakan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Project ID</p>
              <p className="font-medium">mufos2</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Database</p>
              <p className="font-medium">Firestore</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Region</p>
              <p className="font-medium">Default (US)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Realtime Sync</p>
              <p className="font-medium">Polling setiap 5 detik</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
