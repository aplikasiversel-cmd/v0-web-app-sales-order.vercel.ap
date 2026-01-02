"use client"

import useSWR from "swr"

// Default refresh interval for realtime sync (in milliseconds)
const DEFAULT_REFRESH_INTERVAL = 5000 // 5 seconds

// Generic fetcher for API routes
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("Failed to fetch data")
  }
  return res.json()
}

// Hook for realtime users data
export function useRealtimeUsers(options?: { refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<any[]>("/api/realtime/users", fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    users: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Hook for realtime orders data
export function useRealtimeOrders(options?: { refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<any[]>("/api/realtime/orders", fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    orders: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Hook for realtime programs data
export function useRealtimePrograms(options?: { refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<any[]>("/api/realtime/programs", fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    programs: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Hook for realtime dealers data
export function useRealtimeDealers(options?: { refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<any[]>("/api/realtime/dealers", fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    dealers: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Hook for realtime merks data
export function useRealtimeMerks(options?: { refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<any[]>("/api/realtime/merks", fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    merks: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Hook for realtime aktivitas data
export function useRealtimeAktivitas(userId?: string, options?: { refreshInterval?: number }) {
  const url = userId ? `/api/realtime/aktivitas?userId=${userId}` : "/api/realtime/aktivitas"

  const { data, error, isLoading, mutate } = useSWR<any[]>(url, fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    aktivitas: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Hook for realtime simulasi data
export function useRealtimeSimulasi(userId?: string, options?: { refreshInterval?: number }) {
  const url = userId ? `/api/realtime/simulasi?userId=${userId}` : "/api/realtime/simulasi"

  const { data, error, isLoading, mutate } = useSWR<any[]>(url, fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    simulasi: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Hook for realtime notifications
export function useRealtimeNotifications(userId: string, options?: { refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    userId ? `/api/realtime/notifications?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: options?.refreshInterval ?? 3000, // Faster refresh for notifications
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  )

  return {
    notifications: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

// Generic hook for any collection with custom parameters
export function useRealtimeCollection<T>(
  collection: string,
  params?: Record<string, string>,
  options?: { refreshInterval?: number },
) {
  const searchParams = params ? new URLSearchParams(params).toString() : ""
  const url = `/api/realtime/${collection}${searchParams ? `?${searchParams}` : ""}`

  const { data, error, isLoading, mutate } = useSWR<T[]>(url, fetcher, {
    refreshInterval: options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  return {
    data: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}
