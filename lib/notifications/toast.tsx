'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { logger } from '@/lib/monitoring/logger'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
  // Convenience methods
  success: (title: string, message?: string, options?: Partial<Toast>) => string
  error: (title: string, message?: string, options?: Partial<Toast>) => string
  warning: (title: string, message?: string, options?: Partial<Toast>) => string
  info: (title: string, message?: string, options?: Partial<Toast>) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
  maxToasts?: number
  defaultDuration?: number
}

export function ToastProvider({ 
  children, 
  maxToasts = 5, 
  defaultDuration = 5000 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toastData: Omit<Toast, 'id'>): string => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = toastData.duration ?? defaultDuration
    const dismissible = toastData.dismissible ?? true

    const newToast: Toast = {
      ...toastData,
      id,
      duration,
      dismissible,
    }

    setToasts(prev => {
      const updated = [...prev, newToast]
      
      // Remove oldest toasts if we exceed maxToasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts)
      }
      
      return updated
    })

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    // Log toast creation for monitoring
    logger.info('Toast displayed', undefined, {
      type: toastData.type,
      title: toastData.title,
      duration,
    })

    return id
  }, [defaultDuration, maxToasts, removeToast])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const success = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ 
      ...options, 
      type: 'error', 
      title, 
      message, 
      duration: options?.duration ?? 8000 // Errors stay longer
    })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'warning', title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'info', title, message })
  }, [addToast])

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="flex flex-col items-end justify-end min-h-screen p-4 space-y-3">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
          />
        ))}
      </div>
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const getToastStyles = (type: ToastType) => {
    const baseStyles = "pointer-events-auto w-full max-w-sm bg-white shadow-lg rounded-lg border"
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-green-200 bg-green-50`
      case 'error':
        return `${baseStyles} border-red-200 bg-red-50`
      case 'warning':
        return `${baseStyles} border-yellow-200 bg-yellow-50`
      case 'info':
        return `${baseStyles} border-blue-200 bg-blue-50`
      default:
        return `${baseStyles} border-gray-200`
    }
  }

  const getIconStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const getTextStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { title: 'text-green-900', message: 'text-green-700' }
      case 'error':
        return { title: 'text-red-900', message: 'text-red-700' }
      case 'warning':
        return { title: 'text-yellow-900', message: 'text-yellow-700' }
      case 'info':
        return { title: 'text-blue-900', message: 'text-blue-700' }
      default:
        return { title: 'text-gray-900', message: 'text-gray-700' }
    }
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const textStyles = getTextStyles(toast.type)

  return (
    <div className={`${getToastStyles(toast.type)} animate-in slide-in-from-right duration-300`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${getIconStyles(toast.type)}`}>
            {getIcon(toast.type)}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${textStyles.title}`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className={`mt-1 text-sm ${textStyles.message}`}>
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={toast.action.onClick}
                  className="text-sm font-medium text-black hover:text-gray-700 underline"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          {toast.dismissible && (
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                onClick={() => onDismiss(toast.id)}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}