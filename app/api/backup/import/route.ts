import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const sql = neon(process.env.DATABASE_URL!)

    // Import merks first (no foreign keys)
    if (data.merks && data.merks.length > 0) {
      for (const merk of data.merks) {
        await sql`
          INSERT INTO merks (id, nama, is_default, is_active, created_at)
          VALUES (${merk.id}, ${merk.nama}, ${merk.is_default}, ${merk.is_active}, ${merk.created_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import users
    if (data.users && data.users.length > 0) {
      for (const user of data.users) {
        await sql`
          INSERT INTO users (id, username, password, nama_lengkap, role, no_hp, merk, dealer, jabatan, is_first_login, password_last_changed, is_active, created_at, updated_at)
          VALUES (${user.id}, ${user.username}, ${user.password}, ${user.nama_lengkap}, ${user.role}, ${user.no_hp}, ${user.merk}, ${user.dealer}, ${user.jabatan}, ${user.is_first_login}, ${user.password_last_changed}, ${user.is_active}, ${user.created_at}, ${user.updated_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import dealers
    if (data.dealers && data.dealers.length > 0) {
      for (const dealer of data.dealers) {
        await sql`
          INSERT INTO dealers (id, kode_dealer, merk, nama_dealer, alamat, no_telp, is_active, created_at)
          VALUES (${dealer.id}, ${dealer.kode_dealer}, ${dealer.merk}, ${dealer.nama_dealer}, ${dealer.alamat}, ${dealer.no_telp}, ${dealer.is_active}, ${dealer.created_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import programs
    if (data.programs && data.programs.length > 0) {
      for (const program of data.programs) {
        await sql`
          INSERT INTO programs (id, nama_program, jenis_pembiayaan, merk, tdp_persen, is_active, created_at, updated_at)
          VALUES (${program.id}, ${program.nama_program}, ${program.jenis_pembiayaan}, ${program.merk}, ${program.tdp_persen}, ${program.is_active}, ${program.created_at}, ${program.updated_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import tenor_bunga
    if (data.tenorBunga && data.tenorBunga.length > 0) {
      for (const tb of data.tenorBunga) {
        await sql`
          INSERT INTO tenor_bunga (id, program_id, tenor, bunga, is_active)
          VALUES (${tb.id}, ${tb.program_id}, ${tb.tenor}, ${tb.bunga}, ${tb.is_active})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import orders
    if (data.orders && data.orders.length > 0) {
      for (const order of data.orders) {
        await sql`
          INSERT INTO orders (id, sales_id, sales_name, nama_nasabah, foto_ktp_nasabah, nama_pasangan, foto_ktp_pasangan, foto_kk, no_hp, type_unit, merk, dealer, jenis_pembiayaan, nama_program, otr, tdp, angsuran, tenor, cmo_id, cmo_name, catatan_khusus, status, hasil_slik, tanggal_survey, checklist_ktp_pemohon, checklist_ktp_pasangan, checklist_kartu_keluarga, checklist_npwp, checklist_bkr, checklist_livin, checklist_rek_tabungan, checklist_muf_app, foto_survey, claimed_by, claimed_at, created_at, updated_at)
          VALUES (${order.id}, ${order.sales_id}, ${order.sales_name}, ${order.nama_nasabah}, ${order.foto_ktp_nasabah}, ${order.nama_pasangan}, ${order.foto_ktp_pasangan}, ${order.foto_kk}, ${order.no_hp}, ${order.type_unit}, ${order.merk}, ${order.dealer}, ${order.jenis_pembiayaan}, ${order.nama_program}, ${order.otr}, ${order.tdp}, ${order.angsuran}, ${order.tenor}, ${order.cmo_id}, ${order.cmo_name}, ${order.catatan_khusus}, ${order.status}, ${order.hasil_slik}, ${order.tanggal_survey}, ${order.checklist_ktp_pemohon}, ${order.checklist_ktp_pasangan}, ${order.checklist_kartu_keluarga}, ${order.checklist_npwp}, ${order.checklist_bkr}, ${order.checklist_livin}, ${order.checklist_rek_tabungan}, ${order.checklist_muf_app}, ${order.foto_survey}, ${order.claimed_by}, ${order.claimed_at}, ${order.created_at}, ${order.updated_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import order_notes
    if (data.orderNotes && data.orderNotes.length > 0) {
      for (const note of data.orderNotes) {
        await sql`
          INSERT INTO order_notes (id, order_id, user_id, user_name, role, note, status, created_at)
          VALUES (${note.id}, ${note.order_id}, ${note.user_id}, ${note.user_name}, ${note.role}, ${note.note}, ${note.status}, ${note.created_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import simulasi
    if (data.simulasi && data.simulasi.length > 0) {
      for (const sim of data.simulasi) {
        await sql`
          INSERT INTO simulasi (id, user_id, user_name, merk, dealer, jenis_pembiayaan, nama_program, otr, mode, tdp, angsuran, cmo_id, cmo_name, hasil_simulasi, created_at)
          VALUES (${sim.id}, ${sim.user_id}, ${sim.user_name}, ${sim.merk}, ${sim.dealer}, ${sim.jenis_pembiayaan}, ${sim.nama_program}, ${sim.otr}, ${sim.mode}, ${sim.tdp}, ${sim.angsuran}, ${sim.cmo_id}, ${sim.cmo_name}, ${sim.hasil_simulasi}, ${sim.created_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import aktivitas
    if (data.aktivitas && data.aktivitas.length > 0) {
      for (const akt of data.aktivitas) {
        await sql`
          INSERT INTO aktivitas (id, user_id, user_name, role, jenis_aktivitas, tanggal, pic_dealer, dealer, foto_aktivitas, created_at)
          VALUES (${akt.id}, ${akt.user_id}, ${akt.user_name}, ${akt.role}, ${akt.jenis_aktivitas}, ${akt.tanggal}, ${akt.pic_dealer}, ${akt.dealer}, ${akt.foto_aktivitas}, ${akt.created_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    // Import notifications
    if (data.notifications && data.notifications.length > 0) {
      for (const notif of data.notifications) {
        await sql`
          INSERT INTO notifications (id, user_id, title, message, type, is_read, related_order_id, created_at)
          VALUES (${notif.id}, ${notif.user_id}, ${notif.title}, ${notif.message}, ${notif.type}, ${notif.is_read}, ${notif.related_order_id}, ${notif.created_at})
          ON CONFLICT (id) DO NOTHING
        `
      }
    }

    return NextResponse.json({ success: true, message: "Backup restored successfully" })
  } catch (error) {
    console.error("Backup import error:", error)
    return NextResponse.json(
      { error: "Failed to import backup", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
