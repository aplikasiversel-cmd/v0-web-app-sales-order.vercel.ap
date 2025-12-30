"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"
import { notifyNewActivity } from "@/app/actions/notification-actions"
import { getMerks, getDealers, deleteAktivitas } from "@/app/actions/db-actions"

import { useState, useEffect, useRef } from "react"
import { Plus, Calendar, Upload, X, MapPin, Loader2, Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/auth-context"
import { aktivitasStore, userStore } from "@/lib/data-store"
import type { Aktivitas, JenisAktivitas } from "@/lib/types"
import { DEALER_BY_MERK } from "@/lib/types"
import { formatTanggal, formatTanggalWaktu } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

export default function AktivitasPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [aktivitasList, setAktivitasList] = useState<Aktivitas[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedAktivitas, setSelectedAktivitas] = useState<Aktivitas | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [aktivitasToDelete, setAktivitasToDelete] = useState<Aktivitas | null>(null)

  const [dbMerks, setDbMerks] = useState<string[]>([])
  const [dbDealers, setDbDealers] = useState<{ merk: string; nama_dealer: string }[]>([])

  const [formData, setFormData] = useState({
    jenisAktivitas: "" as JenisAktivitas | "",
    tanggal: "",
    merk: "",
    dealer: "",
    picDealer: "",
    fotoAktivitas: [] as string[],
  })

  useEffect(() => {
    const loadMerksAndDealers = async () => {
      try {
        const [merksData, dealersData] = await Promise.all([getMerks(), getDealers()])
        if (merksData) {
          setDbMerks(merksData.map((m: { nama: string }) => m.nama))
        }
        if (dealersData) {
          setDbDealers(
            dealersData.map((d: { merk: string; namaDealer: string }) => ({
              merk: d.merk,
              nama_dealer: d.namaDealer,
            })),
          )
        }
      } catch (error) {
        console.error("Error loading merks/dealers:", error)
      }
    }
    loadMerksAndDealers()
  }, [])

  useEffect(() => {
    const loadAktivitas = async () => {
      if (user) {
        setLoading(true)
        try {
          let data: Aktivitas[]
          if (user.role === "admin") {
            data = await aktivitasStore.getAll()
          } else if (user.role === "cmh") {
            const [ownAktivitas, allAktivitas, allUsers] = await Promise.all([
              aktivitasStore.getByUserId(user.id),
              aktivitasStore.getAll(),
              userStore.getAll(),
            ])

            const cmoUsers = allUsers.filter((u) => u.role === "cmo")
            const cmoUserIds = cmoUsers.map((u) => u.id)

            const cmoAktivitas = allAktivitas.filter((a) => cmoUserIds.includes(a.userId))

            const combinedMap = new Map<string, Aktivitas>()
            ;[...ownAktivitas, ...cmoAktivitas].forEach((a) => combinedMap.set(a.id, a))
            data = Array.from(combinedMap.values())
          } else {
            data = await aktivitasStore.getByUserId(user.id)
          }
          setAktivitasList(data)
        } catch (error) {
          console.error("Error loading aktivitas:", error)
        } finally {
          setLoading(false)
        }
      }
    }
    loadAktivitas()
  }, [user])

  const availableMerks = [...new Set([...dbMerks, "Honda", "Toyota", "Daihatsu", "Suzuki", "Mitsubishi"])]

  const availableDealers = (() => {
    if (!formData.merk) return []
    const dealersFromDefault = DEALER_BY_MERK[formData.merk as keyof typeof DEALER_BY_MERK] || []
    const dealersFromDb = dbDealers.filter((d) => d.merk === formData.merk).map((d) => d.nama_dealer)
    if (dealersFromDb.length === 0 && dealersFromDefault.length === 0) {
      return dbDealers.map((d) => d.nama_dealer)
    }
    return [...new Set([...dealersFromDefault, ...dealersFromDb])]
  })()

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: "File terlalu besar",
            description: "Maksimal ukuran file adalah 2MB",
            variant: "destructive",
          })
          return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            fotoAktivitas: [...prev.fotoAktivitas, reader.result as string],
          }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fotoAktivitas: prev.fotoAktivitas.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (isSaving) return
    setIsSaving(true)

    try {
      const newAktivitas: Omit<Aktivitas, "id" | "createdAt"> = {
        userId: user.id,
        userName: user.namaLengkap,
        role: user.role,
        jenisAktivitas: formData.jenisAktivitas as JenisAktivitas,
        tanggal: formData.tanggal,
        dealer: formData.dealer,
        picDealer: formData.picDealer,
        fotoAktivitas: formData.fotoAktivitas,
      }

      const addedAktivitas = await aktivitasStore.add(newAktivitas)

      if (user.role === "cmo") {
        await notifyNewActivity(addedAktivitas.id, user.namaLengkap, user.id, formData.jenisAktivitas, formData.dealer)
      }

      const updatedList =
        user?.role === "admin" ? await aktivitasStore.getAll() : await aktivitasStore.getByUserId(user?.id || "")
      setAktivitasList(Array.isArray(updatedList) ? updatedList : [])

      setFormData({
        jenisAktivitas: "",
        tanggal: "",
        merk: "",
        dealer: "",
        picDealer: "",
        fotoAktivitas: [],
      })
      setShowAddDialog(false)

      toast({
        title: "Berhasil",
        description: "Aktivitas berhasil ditambahkan",
      })
    } catch (error) {
      console.error("Error adding aktivitas:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menambahkan aktivitas",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (aktivitas: Aktivitas) => {
    setAktivitasToDelete(aktivitas)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!aktivitasToDelete) return

    setIsDeleting(true)
    try {
      await deleteAktivitas(aktivitasToDelete.id)

      const updatedList =
        user?.role === "admin" ? await aktivitasStore.getAll() : await aktivitasStore.getByUserId(user?.id || "")
      setAktivitasList(Array.isArray(updatedList) ? updatedList : [])

      toast({
        title: "Berhasil",
        description: "Aktivitas berhasil dihapus",
      })
    } catch (error) {
      console.error("Error deleting aktivitas:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menghapus aktivitas",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setAktivitasToDelete(null)
    }
  }

  const [activeTab, setActiveTab] = useState("Semua")

  const filteredAktivitas = aktivitasList.filter((aktivitas) => {
    if (activeTab === "Semua") return true
    if (activeTab === "Kunjungan") return aktivitas.jenisAktivitas === "Kunjungan Dealer"
    if (activeTab === "Event") return aktivitas.jenisAktivitas === "Event Dealer"
    if (activeTab === "Pameran") return aktivitas.jenisAktivitas === "Pameran"
    return true
  })

  const canDelete = user?.role === "cmh" || user?.role === "admin"

  if (!user) return null

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Aktivitas" subtitle="Log aktivitas kunjungan dan event" />

      <main className="flex-1 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">{aktivitasList.length} aktivitas tercatat</p>
          {(user.role === "cmo" || user.role === "cmh") && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Aktivitas
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="Semua">Semua</TabsTrigger>
            <TabsTrigger value="Kunjungan">Kunjungan</TabsTrigger>
            <TabsTrigger value="Event">Event</TabsTrigger>
            <TabsTrigger value="Pameran">Pameran</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAktivitas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada aktivitas yang tercatat</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAktivitas.map((aktivitas) => (
              <Card
                key={aktivitas.id}
                className="cursor-pointer hover:shadow-md transition-shadow relative group"
                onClick={() => {
                  setSelectedAktivitas(aktivitas)
                  setShowDetailDialog(true)
                }}
              >
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(aktivitas)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge
                      variant={
                        aktivitas.jenisAktivitas === "Kunjungan Dealer"
                          ? "default"
                          : aktivitas.jenisAktivitas === "Event Dealer"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {aktivitas.jenisAktivitas === "Kunjungan Dealer"
                        ? "Kunjungan"
                        : aktivitas.jenisAktivitas === "Event Dealer"
                          ? "Event"
                          : "Pameran"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatTanggal(aktivitas.tanggal)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium truncate">{aktivitas.dealer}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">PIC: {aktivitas.picDealer}</p>
                    {(user.role === "admin" || user.role === "cmh") && (
                      <p className="text-xs text-muted-foreground">Oleh: {aktivitas.userName}</p>
                    )}
                  </div>
                  {aktivitas.fotoAktivitas && aktivitas.fotoAktivitas.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {aktivitas.fotoAktivitas.slice(0, 3).map((foto, index) => (
                        <img
                          key={index}
                          src={foto || "/placeholder.svg"}
                          alt={`Foto ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ))}
                      {aktivitas.fotoAktivitas.length > 3 && (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
                          +{aktivitas.fotoAktivitas.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Aktivitas</DialogTitle>
              <DialogDescription>Catat aktivitas kunjungan atau event</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Jenis Aktivitas *</Label>
                <Select
                  value={formData.jenisAktivitas}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, jenisAktivitas: value as JenisAktivitas }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis Aktivitas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kunjungan Dealer">Kunjungan Dealer</SelectItem>
                    <SelectItem value="Event Dealer">Event Dealer</SelectItem>
                    <SelectItem value="Pameran">Pameran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tanggal Aktivitas *</Label>
                <Select
                  value={formData.tanggal}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, tanggal: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tanggal" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => {
                      const date = new Date()
                      date.setDate(date.getDate() - i)
                      const dateStr = date.toISOString().split("T")[0]
                      return (
                        <SelectItem key={dateStr} value={dateStr}>
                          {formatTanggal(dateStr)}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Merk *</Label>
                <Select
                  value={formData.merk}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, merk: value, dealer: "" }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Merk" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMerks.map((merk) => (
                      <SelectItem key={merk} value={merk}>
                        {merk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dealer *</Label>
                <Select
                  value={formData.dealer}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, dealer: value }))}
                  disabled={!formData.merk}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Dealer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDealers.map((dealer) => (
                      <SelectItem key={dealer} value={dealer}>
                        {dealer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>PIC Dealer *</Label>
                <Input
                  value={formData.picDealer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, picDealer: e.target.value }))}
                  placeholder="Nama PIC Dealer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Foto Aktivitas</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik untuk upload foto</p>
                  <p className="text-xs text-muted-foreground">Maksimal 2MB per foto</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                {formData.fotoAktivitas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.fotoAktivitas.map((foto, index) => (
                      <div key={index} className="relative">
                        <img
                          src={foto || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="w-full"
                  disabled={isSaving}
                >
                  Batal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Aktivitas</DialogTitle>
            </DialogHeader>
            {selectedAktivitas && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      selectedAktivitas.jenisAktivitas === "Kunjungan Dealer"
                        ? "default"
                        : selectedAktivitas.jenisAktivitas === "Event Dealer"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {selectedAktivitas.jenisAktivitas}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatTanggalWaktu(selectedAktivitas.createdAt)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Tanggal</Label>
                    <p className="font-medium">{formatTanggal(selectedAktivitas.tanggal)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Dealer</Label>
                    <p className="font-medium">{selectedAktivitas.dealer}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">PIC Dealer</Label>
                    <p className="font-medium">{selectedAktivitas.picDealer}</p>
                  </div>
                  {(user.role === "admin" || user.role === "cmh") && (
                    <div>
                      <Label className="text-muted-foreground">Dicatat oleh</Label>
                      <p className="font-medium">
                        {selectedAktivitas.userName} ({selectedAktivitas.role?.toUpperCase()})
                      </p>
                    </div>
                  )}
                </div>

                {selectedAktivitas.fotoAktivitas && selectedAktivitas.fotoAktivitas.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Foto Aktivitas</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {selectedAktivitas.fotoAktivitas.map((foto, index) => (
                        <img
                          key={index}
                          src={foto || "/placeholder.svg"}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Aktivitas</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus aktivitas ini? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  "Hapus"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
