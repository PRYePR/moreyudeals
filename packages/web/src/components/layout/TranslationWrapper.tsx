'use client'

import { TranslationProvider, FloatingLanguageSwitch } from '@/components/TranslatableContent'

interface TranslationWrapperProps {
  children: React.ReactNode
}

export default function TranslationWrapper({ children }: TranslationWrapperProps) {
  return (
    <TranslationProvider>
      {children}
      <FloatingLanguageSwitch />
    </TranslationProvider>
  )
}
