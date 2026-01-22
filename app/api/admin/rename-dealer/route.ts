import { NextRequest, NextResponse } from "next/server"
import { firestoreREST, COLLECTIONS } from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    const { oldName, newName } = await request.json()

    if (!oldName || !newName) {
      return NextResponse.json(
        { error: "oldName and newName are required" },
        { status: 400 }
      )
    }

    console.log(`[v0] Starting dealer rename: "${oldName}" → "${newName}"`)

    const results: Record<string, number> = {
      dealers: 0,
      users: 0,
      orders: 0,
      simulasi: 0,
      aktivitas: 0,
    }

    // 1. Update dealers collection
    console.log("[v0] Updating dealers...")
    const dealers = await firestoreREST.getCollection(COLLECTIONS.DEALERS)
    for (const dealer of dealers) {
      if (dealer.namaDealer === oldName) {
        await firestoreREST.updateDocument(COLLECTIONS.DEALERS, dealer.id, {
          namaDealer: newName,
        })
        results.dealers++
      }
    }

    // 2. Update users collection
    console.log("[v0] Updating users...")
    const users = await firestoreREST.getCollection(COLLECTIONS.USERS)
    for (const user of users) {
      if (user.dealer === oldName) {
        await firestoreREST.updateDocument(COLLECTIONS.USERS, user.id, {
          dealer: newName,
        })
        results.users++
      }
    }

    // 3. Update orders collection
    console.log("[v0] Updating orders...")
    const orders = await firestoreREST.getCollection(COLLECTIONS.ORDERS)
    for (const order of orders) {
      if (order.dealer === oldName) {
        await firestoreREST.updateDocument(COLLECTIONS.ORDERS, order.id, {
          dealer: newName,
        })
        results.orders++
      }
    }

    // 4. Update simulasi collection
    console.log("[v0] Updating simulasi...")
    const simulasi = await firestoreREST.getCollection(COLLECTIONS.SIMULASI)
    for (const sim of simulasi) {
      if (sim.dealer === oldName) {
        await firestoreREST.updateDocument(COLLECTIONS.SIMULASI, sim.id, {
          dealer: newName,
        })
        results.simulasi++
      }
    }

    // 5. Update aktivitas collection
    console.log("[v0] Updating aktivitas...")
    const aktivitas = await firestoreREST.getCollection(COLLECTIONS.AKTIVITAS)
    for (const act of aktivitas) {
      if (act.dealer === oldName) {
        await firestoreREST.updateDocument(COLLECTIONS.AKTIVITAS, act.id, {
          dealer: newName,
        })
        results.aktivitas++
      }
    }

    console.log("[v0] Dealer rename completed:", results)

    return NextResponse.json({
      success: true,
      message: `Successfully renamed "${oldName}" to "${newName}"`,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Error renaming dealer:", error)
    return NextResponse.json(
      { error: error.message || "Failed to rename dealer" },
      { status: 500 }
    )
  }
}
