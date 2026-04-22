import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:pointer-events-none disabled:opacity-50',
                    {
                        'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500': variant === 'primary',
                        'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50': variant === 'secondary',
                        'border border-gray-200 bg-transparent hover:bg-gray-50 text-gray-700': variant === 'outline',
                        'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900': variant === 'ghost',
                        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500': variant === 'danger',
                        'h-9 px-4 text-sm': size === 'sm',
                        'h-10 px-4 py-2': size === 'md',
                        'h-11 px-8 text-base': size === 'lg',
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'
