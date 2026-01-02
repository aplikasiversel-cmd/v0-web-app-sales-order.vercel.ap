import { NextResponse } from "next/server"
import { getSimulasi, getSimulasiByUserId } from "@/app/actions/firebase-actions"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (userId) {
      const simulasi = await getSimulasiByUserId(userId)
      return NextResponse.json(simulasi)
    }

    const simulasi = await getSimulasi()
    return NextResponse.json(simulasi)
  } catch (error) {
    console.error("Error fetching simulasi:", error)
    return NextResponse.json([], { status: 500 })
  }
}
