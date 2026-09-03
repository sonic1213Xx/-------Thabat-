'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const MIN_LOADING_TIME = 500

export function useTabLoading(initialLoading = true) {
  const [isLoading, setIsLoading] = useState(initialLoading)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoldTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const withMinimumDelay = useCallback(async <T>(task: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    const startTime = Date.now()

    const result = await task()

    const elapsedTime = Date.now() - startTime
    const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime)

    await new Promise<void>((resolve) => {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        resolve()
      }, remainingTime)
    })

    setIsLoading(false)
    return result
  }, [])

  useEffect(() => {
    return () => clearHoldTimer()
  }, [clearHoldTimer])

  return {
    isLoading,
    setIsLoading,
    withMinimumDelay,
    clearHoldTimer,
  }
}
