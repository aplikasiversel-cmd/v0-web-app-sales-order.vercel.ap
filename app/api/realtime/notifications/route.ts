import { NextResponse } from "next/server"
import { getNotifications } from "@/app/actions/firebase-actions"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const notifications = await getNotifications(userId)
    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json([], { status: 500 })
  }
}
