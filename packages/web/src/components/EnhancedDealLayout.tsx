'use client'

import { useState, useRef, useEffect } from 'react'

interface EnhancedCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export function EnhancedCard({
  children,
  className = '',
  hover = true,
  delay = 0
}: EnhancedCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      ref={cardRef}
      className={`
        bg-white rounded-xl shadow-lg border border-gray-100
        ${hover ? 'hover:shadow-xl hover:scale-[1.02] transition-all duration-300' : ''}
        ${isVisible ? 'animate-fade-in' : 'opacity-0'}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface PulseLoadingProps {
  className?: string
  lines?: number
}

export function PulseLoading({ className = '', lines = 3 }: PulseLoadingProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          } ${i > 0 ? 'mt-2' : ''}`}
        />
      ))}
    </div>
  )
}

interface FloatingActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  className = ''
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`
        fixed bottom-6 right-6 z-50
        flex items-center space-x-2
        px-4 py-3 rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-300
        ${variants[variant]}
        ${isExpanded ? 'pr-6' : ''}
        ${className}
      `}
    >
      <span className="text-xl">{icon}</span>
      <span className={`
        overflow-hidden whitespace-nowrap transition-all duration-300
        ${isExpanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'}
      `}>
        {label}
      </span>
    </button>
  )
}

interface ProgressBarProps {
  progress: number
  className?: string
  color?: string
}

export function ProgressBar({
  progress,
  className = '',
  color = 'bg-primary-600'
}: ProgressBarProps) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

interface ImageGalleryProps {
  images: string[]
  mainImage: string
  altText: string
  className?: string
}

export function ImageGallery({
  images,
  mainImage,
  altText,
  className = ''
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(mainImage)
  const [loading, setLoading] = useState(true)

  const allImages = [mainImage, ...images.filter(img => img !== mainImage)]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Image */}
      <div className="relative aspect-square w-full bg-gray-100 rounded-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <PulseLoading lines={1} className="w-16 h-16" />
          </div>
        )}
        <img
          src={selectedImage}
          alt={altText}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />

        {/* Zoom Indicator */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-xs">
          🔍 点击放大
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {allImages.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {allImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(image)}
              className={`
                flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2
                transition-all duration-200
                ${selectedImage === image
                  ? 'border-primary-600 scale-110'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <img
                src={image}
                alt={`${altText} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface StatsGridProps {
  stats: Array<{
    label: string
    value: string | number
    icon?: string
    trend?: 'up' | 'down' | 'neutral'
  }>
  className?: string
}

export function StatsGrid({ stats, className = '' }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <EnhancedCard key={index} className="p-4 text-center" delay={index * 100}>
          <div className="space-y-2">
            {stat.icon && (
              <div className="text-2xl">{stat.icon}</div>
            )}
            <div className="text-2xl font-bold text-gray-900">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">
              {stat.label}
            </div>
            {stat.trend && (
              <div className={`text-xs ${
                stat.trend === 'up' ? 'text-green-600' :
                stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {stat.trend === 'up' ? '↗️' : stat.trend === 'down' ? '↘️' : '→'}
              </div>
            )}
          </div>
        </EnhancedCard>
      ))}
    </div>
  )
}

interface TooltipProps {
  children: React.ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({
  children,
  content,
  position = 'top',
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isVisible && (
        <div className={`
          absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg
          whitespace-nowrap transition-opacity duration-200
          ${positions[position]}
        `}>
          {content}
          {/* Arrow */}
          <div className={`
            absolute w-2 h-2 bg-gray-900 transform rotate-45
            ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
            ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
            ${position === 'left' ? 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
            ${position === 'right' ? 'right-full top-1/2 translate-x-1/2 -translate-y-1/2' : ''}
          `} />
        </div>
      )}
    </div>
  )
}