'use client'

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'

type Language = 'zh' | 'de'

interface LanguageContextValue {
  language: Language
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'moreyudeals-language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'zh' || stored === 'de') {
        setLanguage(stored)
      }
    } catch (error) {
      console.warn('[LanguageProvider] Failed to read language from storage', error)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch (error) {
      console.warn('[LanguageProvider] Failed to persist language to storage', error)
    }
  }, [language])

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'zh' ? 'de' : 'zh'))
  }

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    toggleLanguage,
  }), [language])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
