import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'chat_history')

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function sessionPath(id: string) {
  await ensureDataDir()
  return path.join(DATA_DIR, `${id}.json`)
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const filePath = await sessionPath(id)
    const raw = await fs.readFile(filePath, 'utf-8')
    const json = JSON.parse(raw)
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const filePath = await sessionPath(id)
    let existing: { id?: string; title?: string; createdAt?: number; updatedAt?: number; messages?: unknown[] } = {}
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {}

    const now = Date.now()
    const updated = {
      id: id,
      title: (body?.title as string) ?? existing.title ?? 'Untitled',
      createdAt: existing.createdAt ?? now,
      updatedAt: now,
      messages: Array.isArray(body?.messages) ? body.messages : existing.messages ?? []
    }

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const filePath = await sessionPath(id)
    await fs.unlink(filePath)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}


