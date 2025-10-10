import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = path.join(process.cwd(), 'data', 'chat_history')

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function listSessions() {
  await ensureDataDir()
  const files = await fs.readdir(DATA_DIR)
  const sessions = [] as Array<{ id: string; title: string; createdAt: number; updatedAt: number }>
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const id = file.replace(/\.json$/, '')
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8')
      const json = JSON.parse(raw)
      sessions.push({ id, title: json.title ?? 'Untitled', createdAt: json.createdAt ?? Date.now(), updatedAt: json.updatedAt ?? json.createdAt ?? Date.now() })
    } catch {}
  }
  sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  return sessions
}

export async function GET() {
  try {
    const sessions = await listSessions()
    return NextResponse.json({ sessions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const title = (body?.title as string) || 'New Chat'
    const messages = (body?.messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp?: number }>) || []
    const id = randomUUID()
    const now = Date.now()
    await ensureDataDir()
    const filePath = path.join(DATA_DIR, `${id}.json`)
    const payload = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      messages: messages.map(m => ({ ...m, timestamp: m.timestamp ?? now }))
    }
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return NextResponse.json({ id, ...payload })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}


