import type { FoProjectFile } from './projectFile'
import { parseProjectFile } from './projectFile'

const SESSION_KEY = 'fo-simulator-session'
const IDB_NAME = 'fo-simulator'
const IDB_VERSION = 1
const IDB_STORE = 'handles'
const HANDLE_KEY = 'current-file'

export function saveSessionProject(project: FoProjectFile): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(project))
  } catch {
    // Quota / private mode — ignore
  }
}

export function loadSessionProject(): FoProjectFile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return parseProjectFile(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearSessionProject(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

export async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openHandleDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Failed to store file handle'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openHandleDb()
    const handle = await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY)
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle | undefined) ?? null)
      req.onerror = () => reject(req.error ?? new Error('Failed to load file handle'))
    })
    db.close()
    return handle
  } catch {
    return null
  }
}

export async function clearFileHandle(): Promise<void> {
  try {
    const db = await openHandleDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(HANDLE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear file handle'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function ensureFilePermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const opts = { mode } as const
  try {
    if ((await handle.queryPermission(opts)) === 'granted') return true
    if ((await handle.requestPermission(opts)) === 'granted') return true
  } catch {
    return false
  }
  return false
}
