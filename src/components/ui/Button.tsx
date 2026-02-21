import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
                    {
                        'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
                        'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700': variant === 'secondary',
                        'border border-neutral-700 bg-transparent hover:bg-neutral-800 text-neutral-300': variant === 'outline',
                        'bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100': variant === 'ghost',
                        'h-9 px-4 text-sm': size === 'sm',
                        'h-10 px-4 py-2': size === 'md',
                        'h-11 px-8 text-lg': size === 'lg',
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'
