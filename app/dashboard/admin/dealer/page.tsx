"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Search, Tags } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { InputPhone } from "@/components/ui/input-phone"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { generateId } from "@/lib/data-store"
import type { Dealer } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import {
  getDealers,
  createDealer as dbCreateDealer,
  deleteDealer as dbDeleteDealer,
  getMerks,
  createMerk as dbCreateMerk,
  updateMerk as dbUpdateMerk,
  deleteMerk as dbDeleteMerk,
} from "@/app/actions/db-actions"

interface MerkItem {
  id: number
  nama: string
  isDefault: boolean
}

export default function AdminDealerPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [dealerList, setDealerList] = useState<Dealer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null)
  const [allMerks, setAllMerks] = useState<MerkItem[]>([])
  const [showAddMerkInput, setShowAddMerkInput] = useState(false)
  const [newMerkName, setNewMerkName] = useState("")
  const [showMerkDialog, setShowMerkDialog] = useState(false)
  const [editingMerk, setEditingMerk] = useState<MerkItem | null>(null)
  const [editMerkName, setEditMerkName] = useState("")

  const [formData, setFormData] = useState({
    kodeDealer: "",
    merk: "",
    namaDealer: "",
    alamat: "",
    noTelp: "",
    isActive: true,
  })

  useEffect(() => {
    loadDealers()
    loadMerks()
  }, [])

  const loadDealers = async () => {
    try {
      const dealersFromDb = await getDealers()
      setDealerList(dealersFromDb)
    } catch (error) {
      console.error("Error loading dealers:", error)
    }
  }

  const loadMerks = async () => {
    try {
      const merksFromDb = await getMerks()
      setAllMerks(merksFromDb)
    } catch (error) {
      console.error("Error loading merks:", error)
    }
  }

  const handleAddNewMerk = async () => {
    if (!newMerkName.trim()) return

    const merkUpper = newMerkName.trim().toUpperCase()
    if (allMerks.some((m) => m.nama === merkUpper)) {
      toast({
        title: "Merk sudah ada",
        description: `Merk ${merkUpper} sudah terdaftar`,
        variant: "destructive",
      })
      return
    }

    const result = await dbCreateMerk(merkUpper)
    if (result) {
      await loadMerks()
      setFormData((prev) => ({ ...prev, merk: merkUpper }))
      setNewMerkName("")
      setShowAddMerkInput(false)

      toast({
        title: "Berhasil",
        description: `Merk ${merkUpper} berhasil ditambahkan`,
      })
    }
  }

  const filteredDealers = dealerList.filter(
    (d) =>
      d.namaDealer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.kodeDealer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.merk.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAdd = () => {
    setFormData({
      kodeDealer: "",
      merk: "",
      namaDealer: "",
      alamat: "",
      noTelp: "",
      isActive: true,
    })
    setShowAddMerkInput(false)
    setNewMerkName("")
    setShowAddDialog(true)
  }

  const handleEdit = (dealer: Dealer) => {
    setSelectedDealer(dealer)
    setFormData({
      kodeDealer: dealer.kodeDealer,
      merk: dealer.merk,
      namaDealer: dealer.namaDealer,
      alamat: dealer.alamat || "",
      noTelp: dealer.noTelp || "",
      isActive: dealer.isActive,
    })
    setShowAddMerkInput(false)
    setNewMerkName("")
    setShowEditDialog(true)
  }

  const handleDelete = (dealer: Dealer) => {
    setSelectedDealer(dealer)
    setShowDeleteDialog(true)
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    const newDealer: Dealer = {
      id: generateId(),
      kodeDealer: formData.kodeDealer.toUpperCase(),
      merk: formData.merk,
      namaDealer: formData.namaDealer.toUpperCase(),
      alamat: formData.alamat.toUpperCase(),
      noTelp: formData.noTelp,
      isActive: formData.isActive,
    }

    await dbCreateDealer(newDealer)
    await loadDealers()
    setShowAddDialog(false)

    toast({
      title: "Berhasil",
      description: `Dealer ${newDealer.namaDealer} berhasil ditambahkan`,
    })
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDealer) return

    const updatedDealer: Dealer = {
      id: selectedDealer.id,
      kodeDealer: formData.kodeDealer.toUpperCase(),
      merk: formData.merk,
      namaDealer: formData.namaDealer.toUpperCase(),
      alamat: formData.alamat.toUpperCase(),
      noTelp: formData.noTelp,
      isActive: formData.isActive,
    }

    await dbCreateDealer(updatedDealer)
    await loadDealers()
    setShowEditDialog(false)

    toast({
      title: "Berhasil",
      description: "Dealer berhasil diperbarui",
    })
  }

  const confirmDelete = async () => {
    if (!selectedDealer) return

    await dbDeleteDealer(selectedDealer.id)
    await loadDealers()
    setShowDeleteDialog(false)

    toast({
      title: "Berhasil",
      description: "Dealer berhasil dihapus",
    })
  }

  const toggleStatus = async (dealer: Dealer) => {
    const updatedDealer = { ...dealer, isActive: !dealer.isActive }
    await dbCreateDealer(updatedDealer)
    await loadDealers()
  }

  const handleEditMerk = (merk: MerkItem) => {
    setEditingMerk(merk)
    setEditMerkName(merk.nama)
  }

  const submitEditMerk = async () => {
    if (!editingMerk || !editMerkName.trim()) return

    const newMerk = editMerkName.trim().toUpperCase()

    if (newMerk !== editingMerk.nama && allMerks.some((m) => m.nama === newMerk)) {
      toast({
        title: "Merk sudah ada",
        description: `Merk ${newMerk} sudah terdaftar`,
        variant: "destructive",
      })
      return
    }

    const success = await dbUpdateMerk(editingMerk.id, newMerk)
    if (success) {
      await loadMerks()
      await loadDealers()
      setEditingMerk(null)
      setEditMerkName("")

      toast({
        title: "Berhasil",
        description: `Merk berhasil diubah menjadi ${newMerk}`,
      })
    }
  }

  const handleDeleteMerk = async (merk: MerkItem) => {
    if (merk.isDefault) {
      toast({
        title: "Tidak dapat menghapus",
        description: `Merk ${merk.nama} adalah merk default dan tidak dapat dihapus`,
        variant: "destructive",
      })
      return
    }

    const usedByDealers = dealerList.filter((d) => d.merk === merk.nama)

    if (usedByDealers.length > 0) {
      toast({
        title: "Tidak dapat menghapus",
        description: `Merk ${merk.nama} digunakan oleh ${usedByDealers.length} dealer. Ubah merk dealer terlebih dahulu.`,
        variant: "destructive",
      })
      return
    }

    const success = await dbDeleteMerk(merk.id)
    if (success) {
      await loadMerks()

      toast({
        title: "Berhasil",
        description: `Merk ${merk.nama} berhasil dihapus`,
      })
    }
  }

  const handleAddMerkFromDialog = async () => {
    if (!newMerkName.trim()) return

    const merkUpper = newMerkName.trim().toUpperCase()
    if (allMerks.some((m) => m.nama === merkUpper)) {
      toast({
        title: "Merk sudah ada",
        description: `Merk ${merkUpper} sudah terdaftar`,
        variant: "destructive",
      })
      return
    }

    const result = await dbCreateMerk(merkUpper)
    if (result) {
      await loadMerks()
      setNewMerkName("")

      toast({
        title: "Berhasil",
        description: `Merk ${merkUpper} berhasil ditambahkan`,
      })
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Kelola Dealer" description="Halaman admin" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Halaman ini hanya untuk Admin</p>
        </div>
      </div>
    )
  }

  const defaultMerks = allMerks.filter((m) => m.isDefault)
  const customMerks = allMerks.filter((m) => !m.isDefault)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola Dealer" description="Manajemen data dealer" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari dealer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowMerkDialog(true)}>
              <Tags className="h-4 w-4 mr-2" />
              Kelola Merk
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Dealer
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Dealer</CardTitle>
            <CardDescription>{filteredDealers.length} dealer terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Dealer</TableHead>
                    <TableHead>Merk</TableHead>
                    <TableHead className="hidden md:table-cell">No Telp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDealers.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{dealer.kodeDealer}</code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dealer.namaDealer}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{dealer.alamat}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dealer.merk}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{dealer.noTelp}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={dealer.isActive} onCheckedChange={() => toggleStatus(dealer)} />
                          <Badge
                            className={dealer.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                          >
                            {dealer.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(dealer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(dealer)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredDealers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Belum ada dealer terdaftar</p>
                <p className="text-sm">Klik tombol Tambah Dealer untuk menambahkan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dealer Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setShowEditDialog(false)
            setShowAddMerkInput(false)
            setNewMerkName("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? "Edit Dealer" : "Tambah Dealer"}</DialogTitle>
            <DialogDescription>
              {showEditDialog ? "Perbarui data dealer" : "Tambah dealer baru ke sistem"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={showEditDialog ? submitEdit : submitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Kode Dealer *</Label>
              <Input
                value={formData.kodeDealer}
                onChange={(e) => setFormData((prev) => ({ ...prev, kodeDealer: e.target.value.toUpperCase() }))}
                placeholder="Kode Dealer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Merk *</Label>
              {!showAddMerkInput ? (
                <div className="space-y-2">
                  <Select value={formData.merk} onValueChange={(v) => setFormData((prev) => ({ ...prev, merk: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Merk" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMerks.map((merk) => (
                        <SelectItem key={merk.id} value={merk.nama}>
                          {merk.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => setShowAddMerkInput(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Merk Baru
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newMerkName}
                      onChange={(e) => setNewMerkName(e.target.value.toUpperCase())}
                      placeholder="Nama Merk Baru"
                      className="uppercase h-8"
                    />
                    <Button type="button" size="sm" onClick={handleAddNewMerk} disabled={!newMerkName.trim()}>
                      Simpan
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setShowAddMerkInput(false)
                      setNewMerkName("")
                    }}
                  >
                    Batal, Pilih dari Daftar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nama Dealer *</Label>
              <Input
                value={formData.namaDealer}
                onChange={(e) => setFormData((prev) => ({ ...prev, namaDealer: e.target.value.toUpperCase() }))}
                placeholder="Nama Dealer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Alamat *</Label>
              <Textarea
                value={formData.alamat}
                onChange={(e) => setFormData((prev) => ({ ...prev, alamat: e.target.value.toUpperCase() }))}
                placeholder="Alamat Dealer"
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>No Telp</Label>
              <InputPhone
                value={formData.noTelp}
                onChange={(value) => setFormData((prev) => ({ ...prev, noTelp: value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false)
                  setShowEditDialog(false)
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!formData.kodeDealer || !formData.merk || !formData.namaDealer || !formData.alamat}
              >
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Dealer</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus dealer {selectedDealer?.namaDealer}? Tindakan ini tidak dapat
              dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kelola Merk Dialog */}
      <Dialog open={showMerkDialog} onOpenChange={setShowMerkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kelola Merk</DialogTitle>
            <DialogDescription>Tambah, edit, atau hapus merk kendaraan</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Merk */}
            <div className="space-y-2">
              <Label>Tambah Merk Baru</Label>
              <div className="flex gap-2">
                <Input
                  value={newMerkName}
                  onChange={(e) => setNewMerkName(e.target.value.toUpperCase())}
                  placeholder="NAMA MERK BARU"
                  className="uppercase"
                />
                <Button onClick={handleAddMerkFromDialog} disabled={!newMerkName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Custom Merks - Can be edited/deleted */}
            {customMerks.length > 0 && (
              <div className="space-y-2">
                <Label>Merk Tambahan ({customMerks.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {customMerks.map((merk) => (
                    <div key={merk.id} className="flex items-center gap-2 p-2 border rounded-lg">
                      {editingMerk?.id === merk.id ? (
                        <>
                          <Input
                            value={editMerkName}
                            onChange={(e) => setEditMerkName(e.target.value.toUpperCase())}
                            className="h-8 uppercase"
                          />
                          <Button size="sm" onClick={submitEditMerk}>
                            OK
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMerk(null)
                              setEditMerkName("")
                            }}
                          >
                            X
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{merk.nama}</span>
                          <Button size="icon" variant="ghost" onClick={() => handleEditMerk(merk)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteMerk(merk)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default Merks - Read Only */}
            <div className="space-y-2">
              <Label>Merk Default ({defaultMerks.length})</Label>
              <div className="flex flex-wrap gap-2">
                {defaultMerks.map((merk) => (
                  <Badge key={merk.id} variant="secondary">
                    {merk.nama}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowMerkDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
