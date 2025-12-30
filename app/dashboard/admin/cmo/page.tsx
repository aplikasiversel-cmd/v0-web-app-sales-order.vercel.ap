"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Loader2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { userStore, generateId } from "@/lib/data-store"
import type { User, UserRole } from "@/lib/types"
import { validatePassword } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

export default function AdminCmoPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [cmoList, setCmoList] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCmo, setSelectedCmo] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    username: "",
    namaLengkap: "",
    jabatan: "cmo" as "cmo" | "cmh",
    password: "",
    isActive: true,
  })

  useEffect(() => {
    loadCmo()
  }, [])

  const loadCmo = async () => {
    try {
      setLoading(true)
      const allUsers = await userStore.getAll()
      if (Array.isArray(allUsers)) {
        setCmoList(allUsers.filter((u) => u.role === "cmo" || u.role === "cmh"))
      } else {
        setCmoList([])
      }
    } catch (error) {
      console.error("Error loading CMO:", error)
      setCmoList([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCmo = cmoList.filter(
    (c) =>
      c.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAdd = () => {
    setFormData({
      username: "",
      namaLengkap: "",
      jabatan: "cmo",
      password: "Muf1234",
      isActive: true,
    })
    setShowAddDialog(true)
  }

  const handleEdit = (cmo: User) => {
    setSelectedCmo(cmo)
    setFormData({
      username: cmo.username,
      namaLengkap: cmo.namaLengkap,
      jabatan: cmo.role as "cmo" | "cmh",
      password: cmo.password,
      isActive: cmo.isActive,
    })
    setShowEditDialog(true)
  }

  const handleDelete = (cmo: User) => {
    setSelectedCmo(cmo)
    setShowDeleteDialog(true)
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      toast({
        title: "Gagal",
        description: "Password tidak memenuhi persyaratan",
        variant: "destructive",
      })
      return
    }

    const existingUser = await userStore.getByUsername(formData.username)
    if (existingUser) {
      toast({
        title: "Gagal",
        description: "Username sudah digunakan",
        variant: "destructive",
      })
      return
    }

    const newCmo: User = {
      id: generateId(),
      username: formData.username,
      password: formData.password,
      namaLengkap: formData.namaLengkap.toUpperCase(),
      role: formData.jabatan as UserRole,
      jabatan: formData.jabatan.toUpperCase(),
      isFirstLogin: true,
      isActive: formData.isActive,
      createdAt: new Date().toISOString(),
    }

    await userStore.add(newCmo)
    await loadCmo()
    setShowAddDialog(false)

    toast({
      title: "Berhasil",
      description: `${formData.jabatan.toUpperCase()} ${newCmo.namaLengkap} berhasil ditambahkan`,
    })
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCmo) return

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      toast({
        title: "Gagal",
        description: "Password tidak memenuhi persyaratan",
        variant: "destructive",
      })
      return
    }

    await userStore.update(selectedCmo.id, {
      namaLengkap: formData.namaLengkap.toUpperCase(),
      role: formData.jabatan as UserRole,
      jabatan: formData.jabatan.toUpperCase(),
      password: formData.password,
      isActive: formData.isActive,
    })

    await loadCmo()
    setShowEditDialog(false)

    toast({
      title: "Berhasil",
      description: "Data berhasil diperbarui",
    })
  }

  const confirmDelete = async () => {
    if (!selectedCmo) return

    await userStore.delete(selectedCmo.id)
    await loadCmo()
    setShowDeleteDialog(false)

    toast({
      title: "Berhasil",
      description: "Data berhasil dihapus",
    })
  }

  const toggleStatus = async (cmo: User) => {
    await userStore.update(cmo.id, { isActive: !cmo.isActive })
    await loadCmo()
  }

  const resetPassword = async (cmo: User) => {
    await userStore.update(cmo.id, {
      password: "Muf1234",
      isFirstLogin: true,
    })
    await loadCmo()
    toast({
      title: "Berhasil",
      description: `Password ${cmo.namaLengkap} direset ke Muf1234`,
    })
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Kelola CMO/CMH" description="Halaman admin" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Halaman ini hanya untuk Admin</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Kelola CMO/CMH" description="Manajemen data CMO dan CMH" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola CMO/CMH" description="Manajemen data CMO dan CMH" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari CMO/CMH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah CMO/CMH
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar CMO/CMH</CardTitle>
            <CardDescription>{filteredCmo.length} CMO/CMH terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username/NIK</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCmo.map((cmo) => (
                    <TableRow key={cmo.id}>
                      <TableCell>
                        <p className="font-medium">{cmo.namaLengkap}</p>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{cmo.username}</code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cmo.role === "cmh" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}
                        >
                          {cmo.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={cmo.isActive} onCheckedChange={() => toggleStatus(cmo)} />
                          <Badge className={cmo.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {cmo.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cmo)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(cmo)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah CMO/CMH</DialogTitle>
            <DialogDescription>Tambah CMO atau CMH baru</DialogDescription>
          </DialogHeader>

          <form onSubmit={submitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Username/NIK *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Masukkan NIK"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={formData.namaLengkap}
                onChange={(e) => setFormData((prev) => ({ ...prev, namaLengkap: e.target.value.toUpperCase() }))}
                placeholder="Nama Lengkap"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Select
                value={formData.jabatan}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, jabatan: v as "cmo" | "cmh" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmo">CMO (Credit Marketing Officer)</SelectItem>
                  <SelectItem value="cmh">CMH (Credit Marketing Head)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={!formData.username || !formData.namaLengkap}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit CMO/CMH</DialogTitle>
            <DialogDescription>Perbarui data CMO/CMH</DialogDescription>
          </DialogHeader>

          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Username/NIK</Label>
              <Input value={formData.username} disabled />
            </div>

            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={formData.namaLengkap}
                onChange={(e) => setFormData((prev) => ({ ...prev, namaLengkap: e.target.value.toUpperCase() }))}
                placeholder="Nama Lengkap"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Select
                value={formData.jabatan}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, jabatan: v as "cmo" | "cmh" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmo">CMO (Credit Marketing Officer)</SelectItem>
                  <SelectItem value="cmh">CMH (Credit Marketing Head)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-xs h-auto p-0"
                  onClick={() => selectedCmo && resetPassword(selectedCmo)}
                >
                  Reset ke Default
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus CMO/CMH?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus <strong>{selectedCmo?.namaLengkap}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
