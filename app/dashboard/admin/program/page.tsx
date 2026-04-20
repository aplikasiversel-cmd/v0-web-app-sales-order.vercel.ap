"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth-context"
import { programStore, dealerStore } from "@/lib/data-store"
import type { Program, JenisPembiayaan, Dealer } from "@/lib/types"
import { JENIS_PEMBIAYAAN } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { getMerks } from "@/app/actions/db-actions"

const DEFAULT_TENORS = [12, 24, 36, 48, 60]

export default function AdminProgramPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [programList, setProgramList] = useState<Program[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [allMerks, setAllMerks] = useState<string[]>([])
  const [allDealers, setAllDealers] = useState<Dealer[]>([])
  const [filteredDealers, setFilteredDealers] = useState<Dealer[]>([])

  const [formData, setFormData] = useState({
    namaProgram: "",
    jenisPembiayaan: "" as JenisPembiayaan | "",
    merk: "",
    dealers: [] as string[],
    tdpPersen: "20",
    tenorBunga: DEFAULT_TENORS.map((tenor) => ({
      tenor,
      bunga: 5,
      isActive: true,
    })),
    isActive: true,
  })

  useEffect(() => {
    loadPrograms()
    loadMerks()
    loadDealers()
  }, [])

  const loadMerks = async () => {
    try {
      const merksFromDb = await getMerks()
      setAllMerks(merksFromDb.map((m) => m.nama))
    } catch (error) {
      console.error("Error loading merks:", error)
    }
  }

  const loadDealers = async () => {
    try {
      // First ensure all dealers have their merk field properly set
      const { ensureDealerMerkField } = await import("@/app/actions/firebase-actions")
      const { firestoreREST } = await import("@/lib/firebase")
      
      await ensureDealerMerkField()
      
      // Clear cache to ensure fresh data
      if (firestoreREST && firestoreREST.clearCache) {
        firestoreREST.clearCache()
      }

      const dealersFromDb = await dealerStore.getAll()
      console.log("[v0] Raw dealers from DB:", dealersFromDb)
      
      const mappedDealers = (dealersFromDb || []).map((d: any) => ({
        id: d.id || "",
        namaDealer: (d.namaDealer || d.nama_dealer || d.nama || "").toUpperCase().trim(),
        merk: (d.merk || "").trim(),
        isActive: d.isActive !== false,
      }))
      console.log("[v0] Mapped dealers:", mappedDealers)
      setAllDealers(mappedDealers)
    } catch (error) {
      console.error("Error loading dealers:", error)
    }
  }

  useEffect(() => {
    if (showAddDialog || showEditDialog) {
      loadMerks()
      loadDealers()
    }
  }, [showAddDialog, showEditDialog])

  // Filter dealers when merk changes
  useEffect(() => {
    if (formData.merk && allDealers.length > 0) {
      // Case-insensitive merk comparison
      const merkLower = formData.merk.toLowerCase().trim()
      console.log("[v0] Filtering for merk:", formData.merk, "merkLower:", merkLower)
      console.log("[v0] All dealers:", allDealers)
      
      const filtered = allDealers.filter((d) => {
        const dealerMerk = (d.merk || "").toLowerCase().trim()
        const matches = dealerMerk === merkLower && d.isActive !== false
        if (formData.merk === "JAECOO") {
          console.log(`[v0] Checking ${d.namaDealer}: dealerMerk="${dealerMerk}", matches=${matches}`)
        }
        return matches
      })
      console.log("[v0] Filtered dealers:", filtered)
      setFilteredDealers(filtered)
      // Reset dealers array if any selected dealer doesn't match new merk
      if (formData.dealers && formData.dealers.length > 0) {
        const validDealers = formData.dealers.filter(selectedDealer => 
          filtered.some(d => d.namaDealer === selectedDealer)
        )
        if (validDealers.length !== formData.dealers.length) {
          setFormData((prev) => ({ ...prev, dealers: validDealers }))
        }
      }
    } else {
      setFilteredDealers([])
    }
  }, [formData.merk, allDealers])

  const loadPrograms = async () => {
    try {
      setLoading(true)
      const programs = await programStore.getAll()
      setProgramList(Array.isArray(programs) ? programs : [])
    } catch (error) {
      console.error("Error loading programs:", error)
      setProgramList([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPrograms = useMemo(() => {
    return programList.filter(
      (p) =>
        p.namaProgram?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.merk?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [programList, searchQuery])

  const handleAdd = () => {
    setFormData({
      namaProgram: "",
      jenisPembiayaan: "",
      merk: "",
      dealers: [],
      tdpPersen: "20",
      tenorBunga: DEFAULT_TENORS.map((tenor) => ({
        tenor,
        bunga: 5,
        isActive: true,
      })),
      isActive: true,
    })
    setFilteredDealers([])
    setShowAddDialog(true)
  }

  const handleEdit = (program: Program) => {
    setSelectedProgram(program)

    const existingTenorMap = new Map<number, { tenor: number; bunga: number; isActive: boolean }>()

    // Add existing tenors to map
    if (program.tenorBunga && Array.isArray(program.tenorBunga)) {
      for (const tb of program.tenorBunga) {
        existingTenorMap.set(tb.tenor, {
          tenor: tb.tenor,
          bunga: tb.bunga,
          isActive: tb.isActive !== false,
        })
      }
    }

    // Ensure all default tenors exist
    for (const tenor of DEFAULT_TENORS) {
      if (!existingTenorMap.has(tenor)) {
        existingTenorMap.set(tenor, {
          tenor,
          bunga: 5,
          isActive: false,
        })
      }
    }

    // Filter dealers for the current merk
    if (program.merk && allDealers.length > 0) {
      const filtered = allDealers.filter((d) => d.merk === program.merk)
      setFilteredDealers(filtered)
    }

    // Convert to array and sort by tenor ascending
    const mergedTenors = Array.from(existingTenorMap.values()).sort((a, b) => a.tenor - b.tenor)

    setFormData({
      namaProgram: program.namaProgram || "",
      jenisPembiayaan: (program.jenisPembiayaan as JenisPembiayaan) || "",
      merk: program.merk || "",
      dealers: program.dealers || [],
      tdpPersen: program.tdpPersen?.toString() || "20",
      tenorBunga: mergedTenors,
      isActive: program.isActive,
    })
    setShowEditDialog(true)
  }

  const handleDelete = (program: Program) => {
    setSelectedProgram(program)
    setShowDeleteDialog(true)
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    const activeTenors = formData.tenorBunga.filter((tb) => tb.isActive).sort((a, b) => a.tenor - b.tenor)

    const newProgram: Omit<Program, "id"> = {
      namaProgram: formData.namaProgram.toUpperCase(),
      jenisPembiayaan: formData.jenisPembiayaan as JenisPembiayaan,
      merk: formData.merk,
      dealers: formData.dealers.length > 0 ? formData.dealers : undefined,
      tdpPersen: Number.parseFloat(formData.tdpPersen) || 0,
      tenorBunga: activeTenors,
      isActive: formData.isActive,
      tenor: 0,
      bunga: 0,
      adminRate: 0,
      provisiRate: 0,
      asuransiRate: 0,
      tdpMinRate: 0,
    }

    await programStore.add(newProgram)
    loadPrograms()
    setShowAddDialog(false)

    toast({
      title: "Berhasil",
      description: `Program ${newProgram.namaProgram} berhasil ditambahkan`,
    })
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProgram) return

    const tenorMap = new Map<number, { tenor: number; bunga: number; isActive: boolean }>()
    for (const tb of formData.tenorBunga) {
      if (tb.isActive) {
        tenorMap.set(tb.tenor, {
          tenor: tb.tenor,
          bunga: tb.bunga,
          isActive: true,
        })
      }
    }
    const activeTenors = Array.from(tenorMap.values()).sort((a, b) => a.tenor - b.tenor)

    const updatedProgram: Partial<Program> = {
      namaProgram: formData.namaProgram.toUpperCase(),
      jenisPembiayaan: formData.jenisPembiayaan as JenisPembiayaan,
      merk: formData.merk,
      dealers: formData.dealers.length > 0 ? formData.dealers : undefined,
      tdpPersen: Number.parseFloat(formData.tdpPersen) || 0,
      tenorBunga: activeTenors,
      isActive: formData.isActive,
    }

    await programStore.update(selectedProgram.id, updatedProgram)
    loadPrograms()
    setShowEditDialog(false)

    toast({
      title: "Berhasil",
      description: "Program berhasil diperbarui",
    })
  }

  const toggleProgramStatus = async (program: Program) => {
    await programStore.update(program.id, { isActive: !program.isActive })
    loadPrograms()
  }

  const handleTenorChange = (tenor: number, field: "bunga" | "isActive", value: number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      tenorBunga: prev.tenorBunga.map((tb) => (tb.tenor === tenor ? { ...tb, [field]: value } : tb)),
    }))
  }

  const handleAddTenor = () => {
    const existingTenors = formData.tenorBunga.map((tb) => tb.tenor)
    const newTenor = Math.max(...existingTenors) + 12
    setFormData((prev) => ({
      ...prev,
      tenorBunga: [...prev.tenorBunga, { tenor: newTenor, bunga: 5, isActive: true }].sort((a, b) => a.tenor - b.tenor),
    }))
  }

  const confirmDelete = async () => {
    if (!selectedProgram) return

    await programStore.delete(selectedProgram.id)
    loadPrograms()
    setShowDeleteDialog(false)

    toast({
      title: "Berhasil",
      description: `Program ${selectedProgram.namaProgram} berhasil dihapus`,
    })
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Kelola Program" description="Halaman admin" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Halaman ini hanya untuk Admin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Kelola Program" description="Manajemen program pembiayaan" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Program
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Program</CardTitle>
            <CardDescription>{filteredPrograms.length} program terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Program</TableHead>
                      <TableHead>Merk</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>TDP</TableHead>
                      <TableHead>Tenor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrograms.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.namaProgram}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{program.merk}</Badge>
                        </TableCell>
                        <TableCell>{program.jenisPembiayaan || "-"}</TableCell>
                        <TableCell>{program.tdpPersen}%</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {program.tenorBunga
                              ?.filter((tb) => tb.isActive)
                              .sort((a, b) => a.tenor - b.tenor)
                              .map((tb) => (
                                <Badge key={`${program.id}-${tb.tenor}`} variant="secondary" className="text-xs">
                                  {tb.tenor}bln ({tb.bunga}%)
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={program.isActive} onCheckedChange={() => toggleProgramStatus(program)} />
                            <Badge
                              className={program.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                            >
                              {program.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(program)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(program)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && filteredPrograms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Belum ada program terdaftar</p>
                <p className="text-sm">Klik tombol Tambah Program untuk menambahkan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setShowEditDialog(false)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? "Edit Program" : "Tambah Program"}</DialogTitle>
            <DialogDescription>
              {showEditDialog ? "Perbarui data program" : "Tambah program pembiayaan baru"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={showEditDialog ? submitEdit : submitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Program *</Label>
              <Input
                value={formData.namaProgram}
                onChange={(e) => setFormData((prev) => ({ ...prev, namaProgram: e.target.value.toUpperCase() }))}
                placeholder="Nama Program"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Pembiayaan *</Label>
                <Select
                  value={formData.jenisPembiayaan}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, jenisPembiayaan: v as JenisPembiayaan }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_PEMBIAYAAN.map((jenis) => (
                      <SelectItem key={jenis} value={jenis}>
                        {jenis}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Merk *</Label>
                <Select value={formData.merk} onValueChange={(v) => setFormData((prev) => ({ ...prev, merk: v }))}>
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
            </div>

            <div className="space-y-2">
              <Label>Nama Dealer (Pilih satu atau lebih)</Label>
              {formData.merk && filteredDealers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada dealer untuk merk ini</p>
              ) : (
                <div className="border rounded-md p-3 space-y-3 max-h-48 overflow-y-auto">
                  {filteredDealers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Pilih merk terlebih dahulu</p>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="select-all-dealers"
                          checked={formData.dealers.length === filteredDealers.length && filteredDealers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData((prev) => ({
                                ...prev,
                                dealers: filteredDealers.map((d) => d.namaDealer),
                              }))
                            } else {
                              setFormData((prev) => ({ ...prev, dealers: [] }))
                            }
                          }}
                        />
                        <label htmlFor="select-all-dealers" className="text-sm font-medium cursor-pointer">
                          Semua Dealer
                        </label>
                      </div>
                      {filteredDealers.map((dealer) => (
                        <div key={dealer.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={dealer.id}
                            checked={formData.dealers.includes(dealer.namaDealer)}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({
                                ...prev,
                                dealers: checked
                                  ? [...prev.dealers, dealer.namaDealer]
                                  : prev.dealers.filter((d) => d !== dealer.namaDealer),
                              }))
                            }}
                          />
                          <label htmlFor={dealer.id} className="text-sm cursor-pointer">
                            {dealer.namaDealer}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {formData.dealers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.dealers.map((dealer) => (
                    <span key={dealer} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      {dealer}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TDP (%) * (contoh: 10.5)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={formData.tdpPersen}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^\d*\.?\d*$/.test(value)) {
                        setFormData((prev) => ({ ...prev, tdpPersen: value }))
                      }
                    }}
                    placeholder="20"
                    className="w-24"
                    required
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tenor & Bunga</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddTenor}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Tenor
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.tenorBunga
                  .sort((a, b) => a.tenor - b.tenor)
                  .map((tb) => (
                    <div key={tb.tenor} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Checkbox
                        checked={tb.isActive}
                        onCheckedChange={(checked) => handleTenorChange(tb.tenor, "isActive", !!checked)}
                      />
                      <span className="w-20 text-sm font-medium">{tb.tenor} Bulan</span>
                      <Input
                        type="number"
                        value={tb.bunga}
                        onChange={(e) => handleTenorChange(tb.tenor, "bunga", Number.parseFloat(e.target.value) || 0)}
                        className="w-20 h-8"
                        step="0.1"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  ))}
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
                disabled={!formData.namaProgram || !formData.jenisPembiayaan || !formData.merk || !formData.tdpPersen}
              >
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Program</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus program {selectedProgram?.namaProgram}? Tindakan ini tidak dapat
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
