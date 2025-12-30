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
import { Search, Plus, Pencil, Trash2, Eye, EyeOff, Check, X, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userStore } from "@/lib/data-store"
import { getDealers } from "@/app/actions/db-actions"
import type { User, Dealer } from "@/lib/types"
import { MERK_LIST, DEALER_BY_MERK } from "@/lib/types"
import { generateUsername, validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/utils"

function getScalarMerk(merk: string | string[] | undefined | null): string {
  if (!merk) return ""
  if (Array.isArray(merk)) return merk[0] || ""
  // Handle PostgreSQL array format like "{Daihatsu}" or "{\"Daihatsu\"}"
  if (typeof merk === "string") {
    const cleaned = merk
      .replace(/^\{|\}$/g, "")
      .replace(/"/g, "")
      .trim()
    // If it contains comma, take first value
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
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSales, setSelectedSales] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dbDealers, setDbDealers] = useState<Dealer[]>([])
  const [customMerks, setCustomMerks] = useState<string[]>([])
  const [addFormData, setAddFormData] = useState({
    namaLengkap: "",
    noHp: "",
    merk: "",
    dealer: "",
    password: "",
    isActive: true,
  })
  const [editFormData, setEditFormData] = useState({
    namaLengkap: "",
    noHp: "",
    merk: "",
    dealer: "",
    password: "",
    isActive: true,
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

  useEffect(() => {
    loadSales()
    loadDealersAndMerks()
  }, [])

  const loadSales = async () => {
    setIsLoading(true)
    const users = await userStore.getByRole("sales")
    setSalesList(users)
    setIsLoading(false)
  }

  const loadDealersAndMerks = async () => {
    try {
      const dealers = await getDealers()
      setDbDealers(Array.isArray(dealers) ? dealers : [])

      // Load custom merks from localStorage
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
    })
    setShowPassword(false)
    setShowAddDialog(true)
  }

  const handleEdit = (sales: User) => {
    setSelectedSales(sales)
    const merkValue = getScalarMerk(sales.merk)
    setEditFormData({
      namaLengkap: sales.namaLengkap,
      noHp: sales.noHp || "",
      merk: merkValue,
      dealer: sales.dealer || "",
      password: sales.password,
      isActive: sales.isActive,
    })
    setShowEditDialog(true)
  }

  const handleDelete = (sales: User) => {
    setSelectedSales(sales)
    setShowDeleteDialog(true)
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    const passwordValidation = validatePassword(addFormData.password)
    if (!passwordValidation.valid) {
      toast({
        title: "Gagal",
        description: "Password tidak memenuhi persyaratan",
        variant: "destructive",
      })
      return
    }

    const username = generateUsername(addFormData.namaLengkap)
    const newSales: Omit<User, "id" | "createdAt"> = {
      username,
      namaLengkap: addFormData.namaLengkap,
      noHp: addFormData.noHp,
      role: "sales",
      merk: addFormData.merk,
      dealer: addFormData.dealer,
      password: addFormData.password,
      isActive: addFormData.isActive,
    }

    try {
      await userStore.add(newSales as User)
      toast({ title: "Berhasil", description: `Sales ${addFormData.namaLengkap} berhasil ditambahkan` })
      setShowAddDialog(false)
      loadSales()
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal menambahkan sales", variant: "destructive" })
    }
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSales) return

    try {
      await userStore.update(selectedSales.id, {
        namaLengkap: editFormData.namaLengkap,
        nomorHp: editFormData.noHp,
        merk: editFormData.merk,
        dealer: editFormData.dealer,
        password: editFormData.password,
        isActive: editFormData.isActive,
      })

      toast({ title: "Berhasil", description: `Sales ${editFormData.namaLengkap} berhasil diperbarui` })
      setShowEditDialog(false)
      loadSales()
    } catch (error) {
      console.error("Error updating sales:", error)
      toast({ title: "Gagal", description: "Gagal memperbarui sales", variant: "destructive" })
    }
  }

  const confirmDelete = async () => {
    if (!selectedSales) return

    await userStore.delete(selectedSales.id)
    await loadSales()
    setShowDeleteDialog(false)

    toast({
      title: "Berhasil",
      description: "Sales berhasil dihapus",
    })
  }

  const toggleStatus = async (sales: User) => {
    await userStore.update(sales.id, { isActive: !sales.isActive })
    await loadSales()
  }

  const resetPassword = async (sales: User) => {
    await userStore.update(sales.id, {
      password: "Muf1234",
      isFirstLogin: true,
    })
    await loadSales()
    toast({
      title: "Berhasil",
      description: `Password ${sales.namaLengkap} direset ke Muf1234`,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Kelola Sales" description="Manajemen data sales" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola Sales" description="Manajemen data sales" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari sales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Sales
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Sales</CardTitle>
            <CardDescription>{filteredSales.length} sales terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="hidden md:table-cell">Merk</TableHead>
                    <TableHead className="hidden lg:table-cell">Dealer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sales) => (
                    <TableRow key={sales.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sales.namaLengkap}</p>
                          <p className="text-xs text-muted-foreground">{sales.noHp}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{sales.username}</code>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{sales.merk}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm truncate max-w-[200px] block">{sales.dealer}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={sales.isActive} onCheckedChange={() => toggleStatus(sales)} />
                          <Badge className={sales.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {sales.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(sales)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(sales)}>
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

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Sales</DialogTitle>
            <DialogDescription>Tambah sales baru ke sistem</DialogDescription>
          </DialogHeader>

          <form onSubmit={submitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={addFormData.namaLengkap}
                onChange={(e) => setAddFormData((prev) => ({ ...prev, namaLengkap: e.target.value.toUpperCase() }))}
                placeholder="Nama Lengkap"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>No HP</Label>
              <Input
                value={addFormData.noHp}
                onChange={(e) => setAddFormData((prev) => ({ ...prev, noHp: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merk">Merk *</Label>
                <Select
                  key={`merk-add-${addFormData.merk}`}
                  value={addFormData.merk || undefined}
                  onValueChange={(value) => setAddFormData((prev) => ({ ...prev, merk: value, dealer: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Merk" />
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

              <div className="space-y-2">
                <Label htmlFor="dealer">Dealer *</Label>
                <Select
                  key={`dealer-add-${addFormData.dealer}-${addFormData.merk}`}
                  value={addFormData.dealer || undefined}
                  onValueChange={(value) => setAddFormData((prev) => ({ ...prev, dealer: value }))}
                  disabled={!addFormData.merk}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={addFormData.merk ? "Pilih Dealer" : "Pilih Merk Terlebih Dahulu"} />
                  </SelectTrigger>
                  <SelectContent>
                    {addAvailableDealers.length > 0 ? (
                      addAvailableDealers.map((dealer) => (
                        <SelectItem key={dealer} value={dealer}>
                          {dealer}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_no_dealer" disabled>
                        Tidak ada dealer untuk merk ini
                      </SelectItem>
                    )}
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
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, password: e.target.value }))}
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
              {addFormData.password && (
                <div className="space-y-1 text-xs">
                  {PASSWORD_REQUIREMENTS.map((req, i) => {
                    const checks = [
                      addFormData.password.length >= 8,
                      /[A-Z]/.test(addFormData.password),
                      /[a-z]/.test(addFormData.password),
                      /[0-9]/.test(addFormData.password),
                      /[!@#$%^&*]/.test(addFormData.password),
                    ]
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 mr-2 ${checks[i] ? "text-green-600" : "text-red-600"}`}
                      >
                        {checks[i] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {req}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch
                checked={addFormData.isActive}
                onCheckedChange={(checked) => setAddFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={!addFormData.namaLengkap || !addFormData.merk || !addFormData.dealer}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Sales</DialogTitle>
            <DialogDescription>Perbarui data sales</DialogDescription>
          </DialogHeader>

          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-namaLengkap">Nama Lengkap *</Label>
              <Input
                id="edit-namaLengkap"
                value={editFormData.namaLengkap}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, namaLengkap: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-noHp">No HP *</Label>
              <Input
                id="edit-noHp"
                value={editFormData.noHp}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, noHp: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-merk">Merk *</Label>
              <Select
                key={`merk-edit-${editFormData.merk}`}
                value={editFormData.merk || undefined}
                onValueChange={(value) => setEditFormData((prev) => ({ ...prev, merk: value, dealer: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Merk" />
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

            <div className="space-y-2">
              <Label htmlFor="edit-dealer">Dealer *</Label>
              <Select
                key={`dealer-edit-${editFormData.dealer}-${editFormData.merk}`}
                value={editFormData.dealer || undefined}
                onValueChange={(value) => setEditFormData((prev) => ({ ...prev, dealer: value }))}
                disabled={!editFormData.merk}
              >
                <SelectTrigger>
                  <SelectValue placeholder={editFormData.merk ? "Pilih Dealer" : "Pilih Merk Terlebih Dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {editAvailableDealers.length > 0 ? (
                    editAvailableDealers.map((dealer) => (
                      <SelectItem key={dealer} value={dealer}>
                        {dealer}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_no_dealer" disabled>
                      Tidak ada dealer untuk merk ini
                    </SelectItem>
                  )}
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
                  onClick={() => selectedSales && resetPassword(selectedSales)}
                >
                  Reset ke Default
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={editFormData.password}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, password: e.target.value }))}
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
                checked={editFormData.isActive}
                onCheckedChange={(checked) => setEditFormData((prev) => ({ ...prev, isActive: checked }))}
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

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold text-center">Hapus Sales?</h2>
            <p className="text-sm text-center text-muted-foreground">
              Anda yakin ingin menghapus <strong>{selectedSales?.namaLengkap}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </p>
            <DialogFooter className="flex gap-4">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Hapus
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
