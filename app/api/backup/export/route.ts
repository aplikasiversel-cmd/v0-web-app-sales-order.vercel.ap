import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Export all tables
    const [users, programs, tenorBunga, dealers, orders, orderNotes, simulasi, aktivitas, merks, notifications] =
      await Promise.all([
        sql`SELECT * FROM users`,
        sql`SELECT * FROM programs`,
        sql`SELECT * FROM tenor_bunga`,
        sql`SELECT * FROM dealers`,
        sql`SELECT * FROM orders`,
        sql`SELECT * FROM order_notes`,
        sql`SELECT * FROM simulasi`,
        sql`SELECT * FROM aktivitas`,
        sql`SELECT * FROM merks`,
        sql`SELECT * FROM notifications`,
      ])

    return NextResponse.json({
      users,
      programs,
      tenorBunga,
      dealers,
      orders,
      orderNotes,
      simulasi,
      aktivitas,
      merks,
      notifications,
    })
  } catch (error) {
    console.error("Backup export error:", error)
    return NextResponse.json({ error: "Failed to export backup" }, { status: 500 })
  }
}
