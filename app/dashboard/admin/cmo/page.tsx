"use client"

import { useEffect, useState, useMemo } from "react"
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { userStore } from "@/lib/data-store"
import type { User } from "@/lib/types"

const ITEMS_PER_PAGE = 10

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
  const [currentPage, setCurrentPage] = useState(1)

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
        const seenUsernames = new Set<string>()
        const uniqueUsers = allUsers.filter((u) => {
          if (seenUsernames.has(u.username)) {
            return false
          }
          seenUsernames.add(u.username)
          return true
        })
        setCmoList(uniqueUsers.filter((u) => u.role === "cmo" || u.role === "cmh"))
        setCmhList(uniqueUsers.filter((u) => u.role === "cmh" && u.isActive))
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

  const cmhNameMap = useMemo(() => {
    const map = new Map<string, string>()
    cmoList.forEach((c) => {
      if (c.role === "cmh") {
        map.set(c.id, c.namaLengkap)
        // Also map by username for fallback
        map.set(c.username, c.namaLengkap)
      }
    })
    return map
  }, [cmoList])

  const getCmhName = (cmo: User) => {
    // First try cmhName field
    if (cmo.cmhName) return cmo.cmhName
    // Then try lookup by cmhId
    if (cmo.cmhId) {
      const name = cmhNameMap.get(cmo.cmhId)
      if (name) return name
    }
    return "-"
  }

  const filteredCmo = cmoList.filter(
    (c) =>
      c.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalItems = filteredCmo.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCmo = filteredCmo.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleAdd = () => {
    setFormData({
      username: "",
      namaLengkap: "",
      jabatan: "cmo",
      password: "Muf1234!",
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

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*]/.test(password)
    return { hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar }
  }

  const isPasswordValid = (password: string) => {
    const validation = validatePassword(password)
    return Object.values(validation).every(Boolean)
  }

  const handleSubmitAdd = async () => {
    if (!formData.namaLengkap.trim()) {
      toast({ title: "Error", description: "Nama lengkap harus diisi", variant: "destructive" })
      return
    }
    if (!formData.username.trim()) {
      toast({ title: "Error", description: "Username/NIK harus diisi", variant: "destructive" })
      return
    }
    if (!isPasswordValid(formData.password)) {
      toast({ title: "Error", description: "Password tidak memenuhi kriteria", variant: "destructive" })
      return
    }

    if (formData.jabatan === "cmo" && !formData.cmhId) {
      toast({ title: "Error", description: "CMO harus memiliki CMH (Atasan)", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // Find CMH name
      const selectedCmh = cmhList.find((c) => c.id === formData.cmhId)

      await userStore.add({
        username: formData.username,
        namaLengkap: formData.namaLengkap.toUpperCase(),
        password: formData.password,
        role: formData.jabatan,
        jabatan: formData.jabatan === "cmo" ? "CMO (Credit Marketing Officer)" : "CMH (Credit Marketing Head)",
        isActive: formData.isActive,
        isFirstLogin: true,
        cmhId: formData.jabatan === "cmo" ? formData.cmhId : "",
        cmhName: formData.jabatan === "cmo" ? selectedCmh?.namaLengkap || "" : "",
      })
      toast({ title: "Berhasil", description: "CMO/CMH berhasil ditambahkan" })
      setShowAddDialog(false)
      loadCmo()
    } catch (error) {
      console.error("Error adding CMO:", error)
      toast({ title: "Error", description: "Gagal menambahkan CMO/CMH", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedCmo) return
    if (!formData.namaLengkap.trim()) {
      toast({ title: "Error", description: "Nama lengkap harus diisi", variant: "destructive" })
      return
    }
    if (!isPasswordValid(formData.password)) {
      toast({ title: "Error", description: "Password tidak memenuhi kriteria", variant: "destructive" })
      return
    }

    if (formData.jabatan === "cmo" && !formData.cmhId) {
      toast({ title: "Error", description: "CMO harus memiliki CMH (Atasan)", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // Find CMH name
      const selectedCmh = cmhList.find((c) => c.id === formData.cmhId)

      await userStore.update(selectedCmo.id, {
        namaLengkap: formData.namaLengkap.toUpperCase(),
        password: formData.password,
        role: formData.jabatan,
        jabatan: formData.jabatan === "cmo" ? "CMO (Credit Marketing Officer)" : "CMH (Credit Marketing Head)",
        isActive: formData.isActive,
        cmhId: formData.jabatan === "cmo" ? formData.cmhId : "",
        cmhName: formData.jabatan === "cmo" ? selectedCmh?.namaLengkap || "" : "",
      })
      toast({ title: "Berhasil", description: "CMO/CMH berhasil diperbarui" })
      setShowEditDialog(false)
      loadCmo()
    } catch (error) {
      console.error("Error updating CMO:", error)
      toast({ title: "Error", description: "Gagal memperbarui CMO/CMH", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCmo) return
    setSubmitting(true)
    try {
      await userStore.delete(selectedCmo.id)
      toast({ title: "Berhasil", description: "CMO/CMH berhasil dihapus" })
      setShowDeleteDialog(false)
      loadCmo()
    } catch (error) {
      console.error("Error deleting CMO:", error)
      toast({ title: "Error", description: "Gagal menghapus CMO/CMH", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const passwordValidation = validatePassword(formData.password)

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Akses ditolak</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola CMO/CMH" description="Manajemen data CMO dan CMH" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
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
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari CMO/CMH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
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
                    {paginatedCmo.map((cmo) => (
                      <TableRow key={cmo.id}>
                        <TableCell className="font-mono">{cmo.username}</TableCell>
                        <TableCell className="font-medium">{cmo.namaLengkap}</TableCell>
                        <TableCell>
                          <Badge variant={cmo.role === "cmh" ? "default" : "secondary"}>{cmo.role.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{cmo.role === "cmo" ? getCmhName(cmo) : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={cmo.isActive ? "default" : "secondary"}>
                            {cmo.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(cmo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDelete(cmo)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah CMO/CMH</DialogTitle>
            <DialogDescription>Tambahkan data CMO atau CMH baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username/NIK *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Masukkan NIK"
              />
            </div>
            <div>
              <Label>Nama Lengkap *</Label>
              <Input
                value={formData.namaLengkap}
                onChange={(e) => setFormData((prev) => ({ ...prev, namaLengkap: e.target.value }))}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div>
              <Label>Jabatan</Label>
              <Select
                value={formData.jabatan}
                onValueChange={(value: "cmo" | "cmh") =>
                  setFormData((prev) => ({ ...prev, jabatan: value, cmhId: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmo">CMO (Credit Marketing Officer)</SelectItem>
                  <SelectItem value="cmh">CMH (Credit Marketing Head)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.jabatan === "cmo" && (
              <div>
                <Label>CMH (Atasan) *</Label>
                <Select
                  value={formData.cmhId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, cmhId: value }))}
                >
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
                {cmhList.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Belum ada CMH. Tambahkan CMH terlebih dahulu.</p>
                )}
              </div>
            )}
            <div>
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
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
              <div className="mt-2 space-y-1 text-xs">
                <div className={passwordValidation.hasMinLength ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasMinLength ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Minimal 8 karakter
                </div>
                <div className={passwordValidation.hasUpperCase ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasUpperCase ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Huruf besar (A-Z)
                </div>
                <div className={passwordValidation.hasLowerCase ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasLowerCase ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Huruf kecil (a-z)
                </div>
                <div className={passwordValidation.hasNumber ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasNumber ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Angka (0-9)
                </div>
                <div className={passwordValidation.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasSpecialChar ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Karakter khusus
                  (!@#$%^&*)
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitAdd} disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit CMO/CMH</DialogTitle>
            <DialogDescription>Ubah data CMO atau CMH</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username/NIK</Label>
              <Input value={formData.username} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Nama Lengkap *</Label>
              <Input
                value={formData.namaLengkap}
                onChange={(e) => setFormData((prev) => ({ ...prev, namaLengkap: e.target.value }))}
              />
            </div>
            <div>
              <Label>Jabatan</Label>
              <Input
                value={formData.jabatan === "cmo" ? "CMO (Credit Marketing Officer)" : "CMH (Credit Marketing Head)"}
                disabled
                className="bg-muted"
              />
            </div>
            {formData.jabatan === "cmo" && (
              <div>
                <Label>CMH (Atasan) *</Label>
                <Select
                  value={formData.cmhId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, cmhId: value }))}
                >
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
            <div>
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
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
              <div className="mt-2 space-y-1 text-xs">
                <div className={passwordValidation.hasMinLength ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasMinLength ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Minimal 8 karakter
                </div>
                <div className={passwordValidation.hasUpperCase ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasUpperCase ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Huruf besar (A-Z)
                </div>
                <div className={passwordValidation.hasLowerCase ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasLowerCase ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Huruf kecil (a-z)
                </div>
                <div className={passwordValidation.hasNumber ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasNumber ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Angka (0-9)
                </div>
                <div className={passwordValidation.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValidation.hasSpecialChar ? <Check className="inline h-3 w-3 mr-1" /> : "○"} Karakter khusus
                  (!@#$%^&*)
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitEdit} disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus CMO/CMH</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{selectedCmo?.namaLengkap}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={submitting}>
              {submitting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
