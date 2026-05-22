'use client'

import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 120 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-14', className)}
      aria-hidden="true"
    >
      <path
        d="M16 16C34 16 43 25 60 38C77 25 86 16 104 16"
        stroke="#C2463B"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 36H92"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M16 56C34 56 43 47 60 34C77 47 86 56 104 56"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="36" r="7.5" fill="currentColor" />
      <circle cx="60" cy="36" r="4.5" fill="currentColor" />
      <circle cx="16" cy="16" r="4.5" fill="#C2463B" />
      <circle cx="104" cy="16" r="4.5" fill="#C2463B" />
      <circle cx="16" cy="56" r="4.5" fill="currentColor" />
      <circle cx="104" cy="56" r="4.5" fill="currentColor" />
    </svg>
  )
}

interface BrandLockupProps {
  className?: string
  textClassName?: string
  compact?: boolean
  showTagline?: boolean
}

export function BrandLockup({
  className,
  textClassName,
  compact = false,
  showTagline = false,
}: BrandLockupProps) {
  return (
    <div className={cn('flex items-center gap-3 text-foreground', className)}>
      <BrandMark className={cn(compact ? 'h-7 w-12' : 'h-8 w-14')} />
      <div className={cn('min-w-0', textClassName)}>
        <div className={cn(compact ? 'text-xl' : 'text-2xl', 'font-serif font-semibold leading-none')}>
          Conduit
        </div>
        {showTagline && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Chain Agents, Pay Per Call
          </p>
        )}
      </div>
    </div>
  )
}
