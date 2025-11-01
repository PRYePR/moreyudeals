'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import FilterSidebar from './FilterSidebar'

interface MobileFilterButtonProps {
  merchants: Array<{ name: string; count: number }>
  currentMerchant?: string | null
}

export default function MobileFilterButton({ merchants, currentMerchant }: MobileFilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 筛选按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 bg-brand-primary hover:bg-brand-hover text-white p-4 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2"
      >
        <Filter className="w-5 h-5" />
        <span className="font-medium">筛选</span>
      </button>

      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 抽屉 */}
      <div
        className={`lg:hidden fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } overflow-y-auto`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">筛选与排序</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <FilterSidebar
            merchants={merchants}
            currentMerchant={currentMerchant}
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-brand-primary hover:bg-brand-hover text-white py-3 rounded-lg font-medium transition-colors"
          >
            应用筛选
          </button>
        </div>
      </div>
    </>
  )
}
