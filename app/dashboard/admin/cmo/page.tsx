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
import { formatRole } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

export default function AdminCmoPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [cmoList, setCmoList] = useState<User[]>([])
  const [cmhList, setCmhList] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCmo, setSelectedCmo] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    username: "",
    namaLengkap: "",
    jabatan: "cmo" as "cmo" | "cmh",
    password: "",
    isActive: true,
    cmhId: "",
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
        setCmhList(allUsers.filter((u) => u.role === "cmh" && u.isActive))
      } else {
        setCmoList([])
        setCmhList([])
      }
    } catch (error) {
      console.error("[v0] Error loading CMO:", error)
      setCmoList([])
      setCmhList([])
    } finally {
      setLoading(false)
    }
  }

  const getCmhName = (cmhId?: string) => {
    if (!cmhId) return "-"
    const cmh = cmhList.find((c) => c.id === cmhId)
    // Also search in cmoList in case CMH is not in cmhList yet
    if (!cmh) {
      const cmhFromAll = cmoList.find((c) => c.id === cmhId && c.role === "cmh")
      return cmhFromAll?.namaLengkap || "-"
    }
    return cmh?.namaLengkap || "-"
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
      cmhId: "",
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
      cmhId: cmo.cmhId || "",
    })
    setShowEditDialog(true)
  }

  const handleDelete = (cmo: User) => {
    setSelectedCmo(cmo)
    setShowDeleteDialog(true)
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (formData.password.length < 6) {
        toast({
          title: "Gagal",
          description: "Password minimal 6 karakter",
          variant: "destructive",
        })
        setSubmitting(false)
        return
      }

      const existingUser = await userStore.getByUsername(formData.username)

      if (existingUser) {
        toast({
          title: "Gagal",
          description: "Username sudah digunakan",
          variant: "destructive",
        })
        setSubmitting(false)
        return
      }

      const selectedCmh = cmhList.find((c) => c.id === formData.cmhId)

      const newCmo: User = {
        id: generateId(),
        username: formData.username,
        password: formData.password,
        namaLengkap: formData.namaLengkap.toUpperCase(),
        role: formData.jabatan as UserRole,
        jabatan: formData.jabatan === "cmo" ? "CMO" : "CMH",
        isFirstLogin: true,
        isActive: formData.isActive,
        createdAt: new Date().toISOString(),
        cmhId: formData.jabatan === "cmo" ? formData.cmhId : undefined,
        cmhName: formData.jabatan === "cmo" && selectedCmh ? selectedCmh.namaLengkap : undefined,
      }

      await userStore.add(newCmo)

      toast({
        title: "Berhasil",
        description: `${formData.jabatan === "cmo" ? "CMO" : "CMH"} berhasil ditambahkan`,
      })

      setShowAddDialog(false)
      loadCmo()
    } catch (error) {
      console.error("Error adding CMO:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menambah data",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCmo) return
    setSubmitting(true)

    try {
      if (formData.password.length < 6) {
        toast({
          title: "Gagal",
          description: "Password minimal 6 karakter",
          variant: "destructive",
        })
        setSubmitting(false)
        return
      }

      const selectedCmh = cmhList.find((c) => c.id === formData.cmhId)

      await userStore.update(selectedCmo.id, {
        namaLengkap: formData.namaLengkap.toUpperCase(),
        password: formData.password,
        isActive: formData.isActive,
        jabatan: formData.jabatan === "cmo" ? "CMO" : "CMH",
        cmhId: formData.jabatan === "cmo" ? formData.cmhId : null,
        cmhName: formData.jabatan === "cmo" && selectedCmh ? selectedCmh.namaLengkap : null,
      })

      toast({
        title: "Berhasil",
        description: "Data berhasil diperbarui",
      })

      setShowEditDialog(false)
      loadCmo()
    } catch (error) {
      console.error("Error updating CMO:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat memperbarui data",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedCmo) return
    setSubmitting(true)

    try {
      await userStore.delete(selectedCmo.id)

      toast({
        title: "Berhasil",
        description: "Data berhasil dihapus",
      })

      setShowDeleteDialog(false)
      loadCmo()
    } catch (error) {
      console.error("Error deleting CMO:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menghapus data",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola CMO/CMH" description="Manajemen data CMO dan CMH" />

      <div className="flex-1 p-4 lg:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Daftar CMO/CMH</CardTitle>
              <CardDescription>Kelola data CMO dan CMH dalam sistem</CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah CMO/CMH
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari CMO/CMH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username/NIK</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>CMH</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCmo.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Tidak ada data CMO/CMH
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCmo.map((cmo) => (
                        <TableRow key={cmo.id}>
                          <TableCell className="font-medium">{cmo.username}</TableCell>
                          <TableCell>{cmo.namaLengkap}</TableCell>
                          <TableCell>
                            <Badge variant={cmo.role === "cmh" ? "default" : "secondary"}>{formatRole(cmo.role)}</Badge>
                          </TableCell>
                          <TableCell>{cmo.role === "cmo" ? cmo.cmhName || getCmhName(cmo.cmhId) : "-"}</TableCell>
                          <TableCell>
                            <Badge variant={cmo.isActive ? "default" : "outline"}>
                              {cmo.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(cmo)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(cmo)}>
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
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah CMO/CMH</DialogTitle>
            <DialogDescription>Tambah CMO atau CMH baru</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdd}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username/NIK *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Masukkan Username"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
                <Input
                  id="namaLengkap"
                  value={formData.namaLengkap}
                  onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                  placeholder="Masukkan Nama Lengkap"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jabatan">Jabatan *</Label>
                <Select
                  value={formData.jabatan}
                  onValueChange={(value: "cmo" | "cmh") => setFormData({ ...formData, jabatan: value, cmhId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jabatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cmo">CMO (Credit Marketing Officer)</SelectItem>
                    <SelectItem value="cmh">CMH (Credit Marketing Head)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.jabatan === "cmo" && (
                <div className="grid gap-2">
                  <Label htmlFor="cmhId">CMH (Atasan) *</Label>
                  <Select value={formData.cmhId} onValueChange={(value) => setFormData({ ...formData, cmhId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih CMH" />
                    </SelectTrigger>
                    <SelectContent>
                      {cmhList.map((cmh) => (
                        <SelectItem key={cmh.id} value={cmh.id}>
                          {cmh.namaLengkap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Status Aktif</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit CMO/CMH</DialogTitle>
            <DialogDescription>Ubah data CMO atau CMH</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-username">Username/NIK</Label>
                <Input id="edit-username" value={formData.username} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-namaLengkap">Nama Lengkap *</Label>
                <Input
                  id="edit-namaLengkap"
                  value={formData.namaLengkap}
                  onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-jabatan">Jabatan</Label>
                <Input
                  id="edit-jabatan"
                  value={formData.jabatan === "cmo" ? "CMO (Credit Marketing Officer)" : "CMH (Credit Marketing Head)"}
                  disabled
                />
              </div>
              {formData.jabatan === "cmo" && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-cmhId">CMH (Atasan)</Label>
                  <Select value={formData.cmhId} onValueChange={(value) => setFormData({ ...formData, cmhId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih CMH" />
                    </SelectTrigger>
                    <SelectContent>
                      {cmhList.map((cmh) => (
                        <SelectItem key={cmh.id} value={cmh.id}>
                          {cmh.namaLengkap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-isActive">Status Aktif</Label>
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus CMO/CMH</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {selectedCmo?.namaLengkap}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
