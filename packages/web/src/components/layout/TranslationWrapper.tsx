'use client'

import { TranslationProvider } from '@/components/TranslatableContent'

interface TranslationWrapperProps {
  children: React.ReactNode
}

export default function TranslationWrapper({ children }: TranslationWrapperProps) {
  return (
    <TranslationProvider>
      {children}
    </TranslationProvider>
  )
}
