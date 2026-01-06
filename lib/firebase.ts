// Firebase REST API Configuration
export const FIREBASE_CONFIG = {
  projectId: "mufos2",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
}

// Firestore REST API base URL with API key
const getBaseUrl = () => {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`
}

const getApiKeyParam = () => {
  if (FIREBASE_CONFIG.apiKey) {
    return `key=${FIREBASE_CONFIG.apiKey}`
  }
  return ""
}

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  PROGRAMS: "programs",
  TENOR_BUNGA: "tenor_bunga",
  DEALERS: "dealers",
  ORDERS: "orders",
  ORDER_NOTES: "order_notes",
  SIMULASI: "simulasi",
  AKTIVITAS: "aktivitas",
  MERKS: "merks",
  NOTIFICATIONS: "notifications",
}

interface CacheEntry {
  data: any
  timestamp: number
}

const cache: Map<string, CacheEntry> = new Map()

const CACHE_TTL = 604800000 // 1 week cache TTL
const QUERY_CACHE_TTL = 604800000 // 1 week for queries
const DOC_CACHE_TTL = 86400000 // 24 hours for individual documents

function getCacheKey(type: string, ...args: string[]): string {
  return `${type}:${args.join(":")}`
}

function getFromCache(key: string, ttl: number = CACHE_TTL): any | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data
  }
  return null
}

function getStaleCache(key: string): any | null {
  const entry = cache.get(key)
  return entry ? entry.data : null
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

let isRateLimited = false
let rateLimitUntil = 0
const RATE_LIMIT_COOLDOWN = 1800000 // 30 minutes cooldown after 429

function checkRateLimited(): boolean {
  if (isRateLimited && Date.now() < rateLimitUntil) {
    return true
  }
  if (isRateLimited && Date.now() >= rateLimitUntil) {
    isRateLimited = false
  }
  return false
}

function setRateLimited(): void {
  isRateLimited = true
  rateLimitUntil = Date.now() + RATE_LIMIT_COOLDOWN
  console.log(`[v0] Firebase rate limited, will retry after ${RATE_LIMIT_COOLDOWN / 60000} minutes`)
}

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 2000 // 2 seconds minimum between requests

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

// Helper to convert Firestore REST format to plain object
function firestoreDocToObject(doc: any): Record<string, any> {
  const fields = doc.fields || {}
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(fields)) {
    result[key] = convertFirestoreValue(value as any)
  }

  // Extract document ID from name
  if (doc.name) {
    const parts = doc.name.split("/")
    result.id = parts[parts.length - 1]
  }

  return result
}

// Convert Firestore value types to JavaScript types
function convertFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue
  if (value.integerValue !== undefined) return Number.parseInt(value.integerValue)
  if (value.doubleValue !== undefined) return Number.parseFloat(value.doubleValue)
  if (value.booleanValue !== undefined) return value.booleanValue
  if (value.nullValue !== undefined) return null
  if (value.timestampValue !== undefined) return value.timestampValue
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(convertFirestoreValue)
  }
  if (value.mapValue !== undefined) {
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      result[k] = convertFirestoreValue(v)
    }
    return result
  }
  return null
}

// Convert JavaScript value to Firestore format
function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === "string") return { stringValue: value }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === "boolean") return { booleanValue: value }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } }
  }
  if (typeof value === "object") {
    const fields: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(value) }
}

// Convert object to Firestore document format
function objectToFirestoreDoc(obj: Record<string, any>): { fields: Record<string, any> } {
  const fields: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key !== "id") {
      fields[key] = toFirestoreValue(value)
    }
  }
  return { fields }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") {
      throw new Error("Request timed out")
    }
    throw error
  }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2, timeoutMs = 15000): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await waitForRateLimit()
      const response = await fetchWithTimeout(url, options, timeoutMs)

      if (response.status === 429) {
        setRateLimited()
        // Return the 429 response to let caller handle it with cache
        return response
      }

      return response
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }

  throw lastError || new Error("All retry attempts failed")
}

// Firestore REST API functions
export const firestoreREST = {
  // Get all documents in a collection with pagination support
  async getCollection(collectionName: string): Promise<any[]> {
    const cacheKey = getCacheKey("collection", collectionName)

    const cached = getFromCache(cacheKey, CACHE_TTL)
    if (cached !== null) {
      console.log(`[v0] getCollection ${collectionName} - from cache: ${cached.length} docs`)
      return cached
    }

    if (checkRateLimited()) {
      const staleCache = getStaleCache(cacheKey)
      if (staleCache) {
        console.log(`[v0] getCollection ${collectionName} - from stale cache (rate limited): ${staleCache.length} docs`)
        return staleCache
      }
      console.log(`[v0] getCollection ${collectionName} - rate limited, no cache`)
      return []
    }

    try {
      const apiKeyParam = getApiKeyParam()
      const allDocuments: any[] = []
      let nextPageToken: string | null = null

      console.log(`[v0] getCollection ${collectionName} - fetching from Firebase`)

      do {
        const params = new URLSearchParams()
        params.set("pageSize", "1000")
        if (apiKeyParam) params.set("key", FIREBASE_CONFIG.apiKey)
        if (nextPageToken) params.set("pageToken", nextPageToken)

        const url = `${getBaseUrl()}/${collectionName}?${params.toString()}`

        const response = await fetchWithRetry(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          console.log(`[v0] getCollection ${collectionName} - error status: ${response.status}`)
          if (response.status === 429) {
            setRateLimited()
          }
          const staleCache = getStaleCache(cacheKey)
          if (staleCache) {
            console.log(`[v0] getCollection ${collectionName} - from stale cache (error): ${staleCache.length} docs`)
            return staleCache
          }
          return []
        }

        const data = await response.json()
        const documents = (data.documents || []).map(firestoreDocToObject)
        allDocuments.push(...documents)
        nextPageToken = data.nextPageToken || null
      } while (nextPageToken)

      console.log(`[v0] getCollection ${collectionName} - fetched ${allDocuments.length} docs`)
      setCache(cacheKey, allDocuments)
      return allDocuments
    } catch (error: any) {
      console.error(`[v0] getCollection ${collectionName} - error:`, error.message)
      const staleCache = getStaleCache(cacheKey)
      if (staleCache) {
        console.log(`[v0] getCollection ${collectionName} - from stale cache (exception): ${staleCache.length} docs`)
        return staleCache
      }
      return []
    }
  },

  // Get a single document
  async getDocument(collectionName: string, docId: string): Promise<any | null> {
    const cacheKey = getCacheKey("doc", collectionName, docId)
    const cached = getFromCache(cacheKey, DOC_CACHE_TTL)
    if (cached !== null) {
      return cached
    }

    if (checkRateLimited()) {
      const staleCache = getStaleCache(cacheKey)
      if (staleCache) return staleCache
      return null
    }

    try {
      const apiKeyParam = getApiKeyParam()
      const url = `${getBaseUrl()}/${collectionName}/${docId}${apiKeyParam ? `?${apiKeyParam}` : ""}`

      const response = await fetchWithRetry(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        if (response.status === 429) setRateLimited()
        // Return stale cache on error
        const staleCache = getStaleCache(cacheKey)
        if (staleCache) return staleCache
        return null
      }

      const data = await response.json()
      const result = firestoreDocToObject(data)
      setCache(cacheKey, result)
      return result
    } catch (error: any) {
      console.error(`[v0] Error getting document ${collectionName}/${docId}:`, error.message)
      const staleCache = getStaleCache(cacheKey)
      if (staleCache) return staleCache
      return null
    }
  },

  // Create or update a document
  async setDocument(collectionName: string, docId: string, data: Record<string, any>): Promise<any | null> {
    if (checkRateLimited()) {
      console.log(`[v0] Skipping setDocument for ${collectionName}/${docId} (rate limited)`)
      return { id: docId, ...data }
    }

    try {
      const apiKeyParam = getApiKeyParam()
      const url = `${getBaseUrl()}/${collectionName}/${docId}${apiKeyParam ? `?${apiKeyParam}` : ""}`

      const response = await fetchWithRetry(
        url,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(objectToFirestoreDoc(data)),
        },
        2,
        20000,
      )

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimited()
          // Return optimistically
          return { id: docId, ...data }
        }
        const errorText = await response.text()
        console.error(`[v0] Firestore SET error: ${response.status}`, errorText)
        throw new Error(`Failed to set document: ${response.status}`)
      }

      const result = await response.json()
      const doc = firestoreDocToObject(result)

      setCache(getCacheKey("doc", collectionName, docId), doc)
      cache.delete(getCacheKey("collection", collectionName))

      return doc
    } catch (error: any) {
      console.error(`[v0] Error setting document ${collectionName}/${docId}:`, error.message)
      throw error
    }
  },

  // Update specific fields
  async updateDocument(collectionName: string, docId: string, updates: Record<string, any>): Promise<boolean> {
    if (checkRateLimited()) {
      console.log(`[v0] Skipping updateDocument for ${collectionName}/${docId} (rate limited)`)
      return true
    }

    try {
      const updateMask = Object.keys(updates)
        .map((k) => `updateMask.fieldPaths=${k}`)
        .join("&")
      const apiKeyParam = getApiKeyParam()
      const separator = updateMask ? "&" : ""
      const url = `${getBaseUrl()}/${collectionName}/${docId}?${updateMask}${apiKeyParam ? `${separator}${apiKeyParam}` : ""}`

      const response = await fetchWithRetry(
        url,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(objectToFirestoreDoc(updates)),
        },
        2,
        20000,
      )

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimited()
          return true // Return optimistically
        }
        console.error(`[v0] Firestore UPDATE error: ${response.status}`)
        return false
      }

      cache.delete(getCacheKey("doc", collectionName, docId))
      cache.delete(getCacheKey("collection", collectionName))

      return true
    } catch (error: any) {
      console.error(`[v0] Error updating document ${collectionName}/${docId}:`, error.message)
      return false
    }
  },

  // Delete a document
  async deleteDocument(collectionName: string, docId: string): Promise<boolean> {
    if (checkRateLimited()) {
      console.log(`[v0] Skipping deleteDocument for ${collectionName}/${docId} (rate limited)`)
      return true
    }

    try {
      const apiKeyParam = getApiKeyParam()
      const url = `${getBaseUrl()}/${collectionName}/${docId}${apiKeyParam ? `?${apiKeyParam}` : ""}`

      const response = await fetchWithRetry(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok && response.status !== 404) {
        if (response.status === 429) {
          setRateLimited()
          return true // Return optimistically
        }
        console.error(`[v0] Firestore DELETE error: ${response.status}`)
        return false
      }

      cache.delete(getCacheKey("doc", collectionName, docId))
      cache.delete(getCacheKey("collection", collectionName))

      return true
    } catch (error: any) {
      console.error(`[v0] Error deleting document ${collectionName}/${docId}:`, error.message)
      return false
    }
  },

  // Query documents with simple where clause
  async queryCollection(
    collectionName: string,
    fieldPath: string,
    op: string,
    value: any,
    limit?: number,
  ): Promise<any[]> {
    const cacheKey = getCacheKey("query", collectionName, fieldPath, op, String(value), String(limit || ""))
    const cached = getFromCache(cacheKey, QUERY_CACHE_TTL)
    if (cached !== null) {
      return cached
    }

    if (checkRateLimited()) {
      const staleCache = getStaleCache(cacheKey)
      if (staleCache) return staleCache
      return []
    }

    try {
      const apiKeyParam = getApiKeyParam()
      const url = `${getBaseUrl()}:runQuery${apiKeyParam ? `?${apiKeyParam}` : ""}`

      console.log(`[v0] Firestore QUERY: ${collectionName} ${fieldPath} ${op} ${value}`)

      const structuredQuery: any = {
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op:
                op === "=="
                  ? "EQUAL"
                  : op === "!="
                    ? "NOT_EQUAL"
                    : op === ">="
                      ? "GREATER_THAN_OR_EQUAL"
                      : op === "<="
                        ? "LESS_THAN_OR_EQUAL"
                        : op === ">"
                          ? "GREATER_THAN"
                          : op === "<"
                            ? "LESS_THAN"
                            : "EQUAL",
              value: toFirestoreValue(value),
            },
          },
        },
      }

      if (limit && limit > 0) {
        structuredQuery.structuredQuery.limit = { value: limit }
      }

      const response = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(structuredQuery),
      })

      if (!response.ok) {
        if (response.status === 429) setRateLimited()
        const staleCache = getStaleCache(cacheKey)
        if (staleCache) return staleCache
        return []
      }

      const data = await response.json()
      const results = data.filter((item: any) => item.document).map((item: any) => firestoreDocToObject(item.document))

      console.log(`[v0] Firestore QUERY results: ${results.length} documents`)

      setCache(cacheKey, results)
      return results
    } catch (error: any) {
      console.error(`[v0] Error querying collection ${collectionName}:`, error.message)
      const staleCache = getStaleCache(cacheKey)
      if (staleCache) return staleCache
      return []
    }
  },

  clearCache() {
    cache.clear()
  },

  isRateLimited(): boolean {
    return checkRateLimited()
  },

  resetRateLimit(): void {
    isRateLimited = false
    rateLimitUntil = 0
  },
}

// Legacy exports for compatibility
export const db = null
export const app = null

export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Firebase operation timed out")), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise])
}
