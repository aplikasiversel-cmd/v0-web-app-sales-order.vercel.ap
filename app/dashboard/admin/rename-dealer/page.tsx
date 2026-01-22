"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function RenameDealerPage() {
  const [oldName, setOldName] = useState("ISTANA MOBIL TRIO MOTOR")
  const [newName, setNewName] = useState("ISTANA MOBIL TRIO BANJARBARU")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleRename = async () => {
    if (!oldName || !newName) {
      alert("Please fill in both dealer names")
      return
    }

    if (oldName === newName) {
      alert("Old name and new name must be different")
      return
    }

    const confirmed = confirm(
      `Are you sure you want to rename "${oldName}" to "${newName}" in ALL collections?\n\nThis will update:\n- Dealers\n- Users\n- Orders\n- Simulasi\n- Aktivitas`
    )

    if (!confirmed) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/rename-dealer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          results: data.results,
        })
      } else {
        setResult({
          success: false,
          error: data.error,
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Rename Dealer</h1>
        <p className="text-gray-600 mb-6">
          Update dealer name across all collections in Firebase
        </p>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Dealer Name
            </label>
            <Input
              value={oldName}
              onChange={(e) => setOldName(e.target.value)}
              placeholder="Enter current dealer name"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Dealer Name
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new dealer name"
              className="w-full"
            />
          </div>

          <Button
            onClick={handleRename}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Renaming..." : "Rename Dealer"}
          </Button>
        </div>

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            {result.success ? (
              <div>
                <h3 className="font-semibold text-green-900 mb-2">{result.message}</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <p>📋 Dealers updated: <span className="font-bold">{result.results.dealers}</span></p>
                  <p>👤 Users updated: <span className="font-bold">{result.results.users}</span></p>
                  <p>📝 Orders updated: <span className="font-bold">{result.results.orders}</span></p>
                  <p>💰 Simulasi updated: <span className="font-bold">{result.results.simulasi}</span></p>
                  <p>📊 Aktivitas updated: <span className="font-bold">{result.results.aktivitas}</span></p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-sm text-red-800">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
