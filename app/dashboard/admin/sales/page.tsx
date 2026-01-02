"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Pencil, Trash2, Eye, EyeOff, Check, X, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userStore, dealerStore } from "@/lib/data-store"
import type { User, Dealer } from "@/lib/types"
import { MERK_LIST, DEALER_BY_MERK } from "@/lib/types"
import { generateUsername, validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/utils"

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

export default function AdminSalesPage() {
  const { toast } = useToast()
  const [salesList, setSalesList] = useState<User[]>([])
  const [spvList, setSpvList] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSales, setSelectedSales] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dbDealers, setDbDealers] = useState<Dealer[]>([])
  const [customMerks, setCustomMerks] = useState<string[]>([])
  const [addFormData, setAddFormData] = useState({
    namaLengkap: "",
    noHp: "",
    merk: "",
    dealer: "",
    password: "",
    isActive: true,
    spvId: "",
  })
  const [editFormData, setEditFormData] = useState({
    namaLengkap: "",
    noHp: "",
    merk: "",
    dealer: "",
    password: "",
    isActive: true,
    spvId: "",
  })

  const allMerks = useMemo(() => {
    const merksFromDb = [...new Set(dbDealers.map((d) => d.merk))]
    const combined = [...new Set([...MERK_LIST, ...customMerks, ...merksFromDb])]
    return combined.sort()
  }, [customMerks, dbDealers])

  const addAvailableDealers = useMemo(() => {
    if (!addFormData.merk) return []
    const dealersFromDb = dbDealers.filter((d) => d.merk === addFormData.merk && d.isActive).map((d) => d.namaDealer)
    const defaultDealers = DEALER_BY_MERK[addFormData.merk] || []
    const combined = [...new Set([...dealersFromDb, ...defaultDealers])]
    return combined.sort()
  }, [addFormData.merk, dbDealers])

  const editAvailableDealers = useMemo(() => {
    if (!editFormData.merk) return []
    const dealersFromDb = dbDealers.filter((d) => d.merk === editFormData.merk && d.isActive).map((d) => d.namaDealer)
    const defaultDealers = DEALER_BY_MERK[editFormData.merk] || []
    const combined = [...new Set([...dealersFromDb, ...defaultDealers])]
    return combined.sort()
  }, [editFormData.merk, dbDealers])

  const addFilteredSpvList = useMemo(() => {
    if (!addFormData.merk || !addFormData.dealer) return []
    return spvList.filter((spv) => spv.merk === addFormData.merk && spv.dealer === addFormData.dealer)
  }, [spvList, addFormData.merk, addFormData.dealer])

  const editFilteredSpvList = useMemo(() => {
    if (!editFormData.merk || !editFormData.dealer) return []
    return spvList.filter((spv) => spv.merk === editFormData.merk && spv.dealer === editFormData.dealer)
  }, [spvList, editFormData.merk, editFormData.dealer])

  useEffect(() => {
    loadSales()
    loadDealersAndMerks()
  }, [])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const [users, allUsers] = await Promise.all([userStore.getByRole("sales"), userStore.getAll()])
      setSalesList(Array.isArray(users) ? users : [])
      if (Array.isArray(allUsers)) {
        setSpvList(allUsers.filter((u) => u.role === "spv" && u.isActive))
      }
    } catch (error) {
      console.error("Error loading sales:", error)
      setSalesList([])
    }
    setIsLoading(false)
  }

  const loadDealersAndMerks = async () => {
    try {
      const dealers = await dealerStore.getAll()
      setDbDealers(Array.isArray(dealers) ? dealers : [])

      if (typeof window !== "undefined") {
        const storedMerks = localStorage.getItem("muf_custom_merks")
        if (storedMerks) {
          try {
            const parsed = JSON.parse(storedMerks)
            setCustomMerks(Array.isArray(parsed) ? parsed : [])
          } catch {
            setCustomMerks([])
          }
        }
      }
    } catch (error) {
      console.error("Error loading dealers:", error)
    }
  }

  const filteredSales = salesList.filter(
    (s) =>
      s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof s.merk === "string" && s.merk.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAdd = () => {
    setSelectedSales(null)
    setAddFormData({
      namaLengkap: "",
      noHp: "",
      merk: "",
      dealer: "",
      password: "",
      isActive: true,
      spvId: "",
    })
    setShowAddDialog(true)
  }

  const handleEdit = (sales: User) => {
    setSelectedSales(sales)
    setEditFormData({
      namaLengkap: sales.namaLengkap,
      noHp: sales.noHp || "",
      merk: getScalarMerk(sales.merk),
      dealer: sales.dealer || "",
      password: sales.password,
      isActive: sales.isActive,
      spvId: sales.spvId || "",
    })
    setShowEditDialog(true)
  }

  const handleDelete = (sales: User) => {
    setSelectedSales(sales)
    setShowDeleteDialog(true)
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const validation = validatePassword(addFormData.password)
    if (!validation.valid) {
      toast({
        title: "Password Tidak Valid",
        description: validation.errors.join(", "),
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    try {
      const username = generateUsername(addFormData.namaLengkap)

      const selectedSpv = addFilteredSpvList.find((s) => s.id === addFormData.spvId)

      const newSales: User = {
        id: crypto.randomUUID(),
        username,
        password: addFormData.password,
        namaLengkap: addFormData.namaLengkap.toUpperCase(),
        role: "sales",
        noHp: addFormData.noHp,
        merk: addFormData.merk,
        dealer: addFormData.dealer,
        isFirstLogin: true,
        isActive: addFormData.isActive,
        createdAt: new Date().toISOString(),
        spvId: addFormData.spvId || undefined,
        spvName: selectedSpv ? selectedSpv.namaLengkap : undefined,
      }

      await userStore.add(newSales)

      toast({
        title: "Berhasil",
        description: `Sales ${newSales.namaLengkap} berhasil ditambahkan dengan username: ${username}`,
      })

      setShowAddDialog(false)
      loadSales()
    } catch (error) {
      console.error("Error adding sales:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menambah sales",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSales) return
    setSubmitting(true)

    const validation = validatePassword(editFormData.password)
    if (!validation.valid) {
      toast({
        title: "Password Tidak Valid",
        description: validation.errors.join(", "),
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    try {
      const selectedSpv = editFilteredSpvList.find((s) => s.id === editFormData.spvId)

      await userStore.update(selectedSales.id, {
        namaLengkap: editFormData.namaLengkap.toUpperCase(),
        noHp: editFormData.noHp,
        merk: editFormData.merk,
        dealer: editFormData.dealer,
        password: editFormData.password,
        isActive: editFormData.isActive,
        spvId: editFormData.spvId || null,
        spvName: selectedSpv ? selectedSpv.namaLengkap : null,
      })

      toast({
        title: "Berhasil",
        description: "Data sales berhasil diperbarui",
      })

      setShowEditDialog(false)
      loadSales()
    } catch (error) {
      console.error("Error updating sales:", error)
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
    if (!selectedSales) return
    setSubmitting(true)

    try {
      await userStore.delete(selectedSales.id)

      toast({
        title: "Berhasil",
        description: "Sales berhasil dihapus",
      })

      setShowDeleteDialog(false)
      loadSales()
    } catch (error) {
      console.error("Error deleting sales:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menghapus sales",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola Sales" description="Manajemen data sales" />

      <div className="flex-1 p-4 lg:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Daftar Sales</CardTitle>
              <CardDescription>Kelola data sales dalam sistem</CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Sales
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari sales..."
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
                      <TableHead>Merk</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>SPV</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Tidak ada data sales
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sales) => (
                        <TableRow key={sales.id}>
                          <TableCell className="font-medium">{sales.username}</TableCell>
                          <TableCell>{sales.namaLengkap}</TableCell>
                          <TableCell>{getScalarMerk(sales.merk) || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sales.dealer || "-"}</TableCell>
                          <TableCell>{sales.spvName || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={sales.isActive ? "default" : "outline"}>
                              {sales.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(sales)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(sales)}>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Sales</DialogTitle>
            <DialogDescription>Tambah sales baru ke sistem</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdd}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
                <Input
                  id="namaLengkap"
                  value={addFormData.namaLengkap}
                  onChange={(e) => setAddFormData({ ...addFormData, namaLengkap: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="noHp">No HP</Label>
                <Input
                  id="noHp"
                  value={addFormData.noHp}
                  onChange={(e) => setAddFormData({ ...addFormData, noHp: e.target.value })}
                  placeholder="Masukkan nomor HP"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="merk">Merk *</Label>
                  <Select
                    value={addFormData.merk}
                    onValueChange={(value) => setAddFormData({ ...addFormData, merk: value, dealer: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih merk" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMerks.map((merk) => (
                        <SelectItem key={merk} value={merk}>
                          {merk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dealer">Dealer *</Label>
                  <Select
                    value={addFormData.dealer}
                    onValueChange={(value) => setAddFormData({ ...addFormData, dealer: value })}
                    disabled={!addFormData.merk}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih dealer" />
                    </SelectTrigger>
                    <SelectContent>
                      {addAvailableDealers.map((dealer) => (
                        <SelectItem key={dealer} value={dealer}>
                          {dealer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="spvId">SPV (Atasan)</Label>
                <Select
                  value={addFormData.spvId}
                  onValueChange={(value) => setAddFormData({ ...addFormData, spvId: value })}
                  disabled={!addFormData.merk || !addFormData.dealer}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !addFormData.merk || !addFormData.dealer
                          ? "Pilih Merk & Dealer dulu"
                          : addFilteredSpvList.length === 0
                            ? "Tidak ada SPV untuk dealer ini"
                            : "Pilih SPV (opsional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada SPV</SelectItem>
                    {addFilteredSpvList.map((spv) => (
                      <SelectItem key={spv.id} value={spv.id}>
                        {spv.namaLengkap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    placeholder="Masukkan password"
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
                <div className="flex flex-wrap gap-2 text-xs">
                  {PASSWORD_REQUIREMENTS.map((req, index) => {
                    const isValid = req.test(addFormData.password)
                    return (
                      <span
                        key={index}
                        className={`flex items-center gap-1 ${isValid ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {isValid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {req.label}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Status Aktif</Label>
                <Switch
                  id="isActive"
                  checked={addFormData.isActive}
                  onCheckedChange={(checked) => setAddFormData({ ...addFormData, isActive: checked })}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sales</DialogTitle>
            <DialogDescription>Ubah data sales</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-namaLengkap">Nama Lengkap *</Label>
                <Input
                  id="edit-namaLengkap"
                  value={editFormData.namaLengkap}
                  onChange={(e) => setEditFormData({ ...editFormData, namaLengkap: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-noHp">No HP</Label>
                <Input
                  id="edit-noHp"
                  value={editFormData.noHp}
                  onChange={(e) => setEditFormData({ ...editFormData, noHp: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-merk">Merk *</Label>
                  <Select
                    value={editFormData.merk}
                    onValueChange={(value) => setEditFormData({ ...editFormData, merk: value, dealer: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih merk" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMerks.map((merk) => (
                        <SelectItem key={merk} value={merk}>
                          {merk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-dealer">Dealer *</Label>
                  <Select
                    value={editFormData.dealer}
                    onValueChange={(value) => setEditFormData({ ...editFormData, dealer: value })}
                    disabled={!editFormData.merk}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih dealer" />
                    </SelectTrigger>
                    <SelectContent>
                      {editAvailableDealers.map((dealer) => (
                        <SelectItem key={dealer} value={dealer}>
                          {dealer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-spvId">SPV (Atasan)</Label>
                <Select
                  value={editFormData.spvId}
                  onValueChange={(value) => setEditFormData({ ...editFormData, spvId: value })}
                  disabled={!editFormData.merk || !editFormData.dealer}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !editFormData.merk || !editFormData.dealer
                          ? "Pilih Merk & Dealer dulu"
                          : editFilteredSpvList.length === 0
                            ? "Tidak ada SPV untuk dealer ini"
                            : "Pilih SPV (opsional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada SPV</SelectItem>
                    {editFilteredSpvList.map((spv) => (
                      <SelectItem key={spv.id} value={spv.id}>
                        {spv.namaLengkap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
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
                <div className="flex flex-wrap gap-2 text-xs">
                  {PASSWORD_REQUIREMENTS.map((req, index) => {
                    const isValid = req.test(editFormData.password)
                    return (
                      <span
                        key={index}
                        className={`flex items-center gap-1 ${isValid ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {isValid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {req.label}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-isActive">Status Aktif</Label>
                <Switch
                  id="edit-isActive"
                  checked={editFormData.isActive}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked })}
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
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Hapus Sales
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus sales {selectedSales?.namaLengkap}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
