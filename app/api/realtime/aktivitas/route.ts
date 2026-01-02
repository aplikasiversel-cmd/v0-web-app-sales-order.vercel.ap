import { NextResponse } from "next/server"
import { getAktivitas, getAktivitasByUserId } from "@/app/actions/firebase-actions"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (userId) {
      const aktivitas = await getAktivitasByUserId(userId)
      return NextResponse.json(aktivitas)
    }

    const aktivitas = await getAktivitas()
    return NextResponse.json(aktivitas)
  } catch (error) {
    console.error("Error fetching aktivitas:", error)
    return NextResponse.json([], { status: 500 })
  }
}
