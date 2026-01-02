"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { userStore, dealerStore } from "@/lib/data-store"
import type { User, Dealer } from "@/lib/types"
import { MERK_LIST, DEALER_BY_MERK } from "@/lib/types"
import { Pencil, Trash2, Plus, Eye, EyeOff, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { generateUsername, validatePassword } from "@/lib/utils"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface SpvFormData {
  namaLengkap: string
  noHp: string
  merk: string
  dealer: string
  password: string
  isActive: boolean
}

const INITIAL_ADD_FORM: SpvFormData = {
  namaLengkap: "",
  noHp: "",
  merk: "",
  dealer: "",
  password: "",
  isActive: true,
}

const INITIAL_EDIT_FORM: SpvFormData = {
  namaLengkap: "",
  noHp: "",
  merk: "",
  dealer: "",
  password: "",
  isActive: true,
}

function getScalarMerk(merk: string | string[] | undefined | null): string {
  if (!merk) return ""
  if (Array.isArray(merk)) return merk[0] || ""
  if (typeof merk === "string") {
    const cleaned = merk
      .replace(/^\{|\}$/g, "")
      .replace(/"/g, "")
      .trim()
    if (cleaned.includes(",")) {
      return cleaned.split(",")[0].trim()
    }
    return cleaned
  }
  return ""
}

function AdminSpvContent() {
  const { toast } = useToast()
  const [spvList, setSpvList] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSpv, setSelectedSpv] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dbDealers, setDbDealers] = useState<Dealer[]>([])
  const [customMerks, setCustomMerks] = useState<string[]>([])
  const [addFormData, setAddFormData] = useState<SpvFormData>({ ...INITIAL_ADD_FORM })
  const [editFormData, setEditFormData] = useState<SpvFormData>({ ...INITIAL_EDIT_FORM })

  const allMerks = useMemo(() => {
    const merksFromDb = [...new Set(dbDealers.map((d) => d.merk))]
    const combined = [...new Set([...MERK_LIST, ...customMerks, ...merksFromDb])]
    return combined.sort()
  }, [customMerks, dbDealers])

  const filteredDealers = (merk: string) => {
    if (!merk) return []
    const dealersFromDb = dbDealers.filter((d) => d.merk === merk && d.isActive).map((d) => d.namaDealer)
    const defaultDealers = DEALER_BY_MERK[merk] || []
    const combined = [...new Set([...dealersFromDb, ...defaultDealers])]
    return combined.sort()
  }

  useEffect(() => {
    loadSpv()
  }, [])

  const loadSpv = async () => {
    try {
      setIsLoading(true)
      const [spvData, dealersData] = await Promise.all([userStore.getByRole("spv"), dealerStore.getAll()])
      setSpvList(Array.isArray(spvData) ? spvData : [])
      setDbDealers(Array.isArray(dealersData) ? dealersData : [])

      const dbMerks = [...new Set(dealersData.map((d: Dealer) => d.merk))]
      setCustomMerks(dbMerks.filter((m) => !MERK_LIST.includes(m)))
    } catch (error) {
      console.error("Error loading SPV:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data SPV",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSpv = spvList.filter(
    (spv) =>
      spv.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spv.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAdd = async () => {
    // Get values with safe fallbacks
    const namaLengkap = String(addFormData?.namaLengkap || "").trim()
    const merk = String(addFormData?.merk || "")
    const dealer = String(addFormData?.dealer || "")
    const password = String(addFormData?.password || "")
    const noHp = String(addFormData?.noHp || "")
    const isActive = addFormData?.isActive !== false

    if (!namaLengkap || !merk || !dealer || !password) {
      toast({
        title: "Error",
        description: "Lengkapi semua field yang wajib diisi",
        variant: "destructive",
      })
      return
    }

    const validation = validatePassword(password)
    if (!validation.valid) {
      toast({
        title: "Password Tidak Valid",
        description: validation.errors.join(", "),
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const username = generateUsername(namaLengkap)
      const newSpv: User = {
        id: `spv-${Date.now()}`,
        username,
        namaLengkap: namaLengkap.toUpperCase(),
        noHp: noHp,
        merk: merk,
        dealer: dealer,
        password: password,
        role: "spv",
        isActive: isActive,
        createdAt: new Date().toISOString(),
      }

      await userStore.add(newSpv)
      toast({
        title: "Berhasil",
        description: `SPV ${newSpv.namaLengkap} berhasil ditambahkan dengan username: ${username}`,
      })
      setShowAddDialog(false)
      setAddFormData({ ...INITIAL_ADD_FORM })
      loadSpv()
    } catch (error) {
      console.error("Error adding SPV:", error)
      toast({
        title: "Error",
        description: "Gagal menambahkan SPV",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedSpv) return

    const namaLengkap = String(editFormData.namaLengkap || "").trim()
    const merk = String(editFormData.merk || "")
    const dealer = String(editFormData.dealer || "")
    const password = String(editFormData.password || "")
    const noHp = String(editFormData.noHp || "")
    const isActive = editFormData.isActive !== false

    if (!namaLengkap || !merk || !dealer) {
      toast({
        title: "Error",
        description: "Lengkapi semua field yang wajib diisi",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const updatedSpv: User = {
        ...selectedSpv,
        namaLengkap: namaLengkap.toUpperCase(),
        noHp: noHp,
        merk: merk,
        dealer: dealer,
        isActive: isActive,
      }

      if (password) {
        const validation = validatePassword(password)
        if (!validation.valid) {
          toast({
            title: "Password Tidak Valid",
            description: validation.errors.join(", "),
            variant: "destructive",
          })
          setSubmitting(false)
          return
        }
        updatedSpv.password = password
      }

      await userStore.update(selectedSpv.id, updatedSpv)
      toast({
        title: "Berhasil",
        description: `SPV ${updatedSpv.namaLengkap} berhasil diperbarui`,
      })
      setShowEditDialog(false)
      setEditFormData({ ...INITIAL_EDIT_FORM })
      setSelectedSpv(null)
      loadSpv()
    } catch (error) {
      console.error("Error updating SPV:", error)
      toast({
        title: "Error",
        description: "Gagal memperbarui SPV",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSpv) return

    try {
      setSubmitting(true)
      await userStore.delete(selectedSpv.id)
      toast({
        title: "Berhasil",
        description: "SPV berhasil dihapus",
      })
      setShowDeleteDialog(false)
      setSelectedSpv(null)
      loadSpv()
    } catch (error) {
      console.error("Error deleting SPV:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus SPV",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (spv: User) => {
    setSelectedSpv(spv)
    setEditFormData({
      namaLengkap: spv.namaLengkap || "",
      noHp: spv.noHp || "",
      merk: getScalarMerk(spv.merk),
      dealer: spv.dealer || "",
      password: "",
      isActive: spv.isActive !== false,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (spv: User) => {
    setSelectedSpv(spv)
    setShowDeleteDialog(true)
  }

  const updateAddForm = (field: keyof SpvFormData, value: string | boolean) => {
    setAddFormData((prev) => ({
      ...INITIAL_ADD_FORM,
      ...prev,
      [field]: value,
    }))
  }

  const updateEditForm = (field: keyof SpvFormData, value: string | boolean) => {
    setEditFormData((prev) => ({
      ...INITIAL_EDIT_FORM,
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola SPV" description="Manajemen data SPV (Supervisor)" />

      <div className="flex-1 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Daftar SPV</CardTitle>
                <CardDescription>Total {spvList.length} SPV terdaftar</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setAddFormData({ ...INITIAL_ADD_FORM })
                  setShowAddDialog(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah SPV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Input
                  placeholder="Cari SPV..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>No HP</TableHead>
                      <TableHead>Merk</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpv.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "Tidak ada SPV yang ditemukan" : "Belum ada data SPV"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSpv.map((spv) => (
                        <TableRow key={spv.id}>
                          <TableCell className="font-mono">{spv.username}</TableCell>
                          <TableCell className="font-medium">{spv.namaLengkap}</TableCell>
                          <TableCell>{spv.noHp || "-"}</TableCell>
                          <TableCell>{getScalarMerk(spv.merk) || "-"}</TableCell>
                          <TableCell>{spv.dealer || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={spv.isActive !== false ? "default" : "secondary"}>
                              {spv.isActive !== false ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(spv)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(spv)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) setAddFormData({ ...INITIAL_ADD_FORM })
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah SPV</DialogTitle>
            <DialogDescription>Tambah SPV baru ke sistem</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={addFormData.namaLengkap}
                onChange={(e) => updateAddForm("namaLengkap", String(e.target.value || "").toUpperCase())}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label>No HP</Label>
              <Input
                value={addFormData.noHp}
                onChange={(e) => updateAddForm("noHp", e.target.value || "")}
                placeholder="Masukkan nomor HP"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Merk *</Label>
                <Select
                  value={addFormData.merk}
                  onValueChange={(v) => {
                    setAddFormData((prev) => ({ ...prev, merk: v, dealer: "" }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih merk" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMerks.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dealer *</Label>
                <Select
                  value={addFormData.dealer}
                  onValueChange={(v) => updateAddForm("dealer", v)}
                  disabled={!addFormData.merk}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dealer" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDealers(addFormData.merk).map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={addFormData.password}
                  onChange={(e) => updateAddForm("password", e.target.value || "")}
                  placeholder="Masukkan password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch checked={addFormData.isActive} onCheckedChange={(c) => updateAddForm("isActive", c)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) {
            setEditFormData({ ...INITIAL_EDIT_FORM })
            setSelectedSpv(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit SPV</DialogTitle>
            <DialogDescription>Ubah data SPV</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={selectedSpv?.username || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={editFormData.namaLengkap}
                onChange={(e) => updateEditForm("namaLengkap", String(e.target.value || "").toUpperCase())}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label>No HP</Label>
              <Input
                value={editFormData.noHp}
                onChange={(e) => updateEditForm("noHp", e.target.value || "")}
                placeholder="Masukkan nomor HP"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Merk *</Label>
                <Select
                  value={editFormData.merk}
                  onValueChange={(v) => {
                    setEditFormData((prev) => ({ ...prev, merk: v, dealer: "" }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih merk" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMerks.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dealer *</Label>
                <Select
                  value={editFormData.dealer}
                  onValueChange={(v) => updateEditForm("dealer", v)}
                  disabled={!editFormData.merk}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dealer" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDealers(editFormData.merk).map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password (kosongkan jika tidak ingin mengubah)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={editFormData.password}
                  onChange={(e) => updateEditForm("password", e.target.value || "")}
                  placeholder="Masukkan password baru"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch checked={editFormData.isActive} onCheckedChange={(c) => updateEditForm("isActive", c)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus SPV</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus SPV {selectedSpv?.namaLengkap}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminSpvPage() {
  return (
    <Suspense fallback={null}>
      <AdminSpvContent />
    </Suspense>
  )
}
