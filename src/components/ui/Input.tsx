import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    className={cn(
                        'flex h-10 w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
                        error && 'border-red-500/50 focus:ring-red-500/50',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        )
    }
)
Input.displayName = 'Input'
