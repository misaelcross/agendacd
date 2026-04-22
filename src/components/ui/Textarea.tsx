import { type TextareaHTMLAttributes, forwardRef, useRef, useCallback, useImperativeHandle, useEffect } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    autoExpand?: boolean
    maxHeight?: number
    minHeight?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, autoExpand = true, maxHeight = 250, minHeight = 80, onChange, rows, ...props }, ref) => {
        const internalRef = useRef<HTMLTextAreaElement | null>(null)

        useImperativeHandle(ref, () => internalRef.current!)

        const adjustHeight = useCallback(() => {
            const textarea = internalRef.current
            if (textarea && autoExpand) {
                textarea.style.height = 'auto'
                const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
                textarea.style.height = `${newHeight}px`
                textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
            }
        }, [autoExpand, maxHeight, minHeight])

        useEffect(() => {
            if (autoExpand) {
                const timer = setTimeout(() => {
                    adjustHeight()
                }, 0)
                return () => clearTimeout(timer)
            }
        }, [props.value, props.defaultValue, autoExpand, adjustHeight])

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            adjustHeight()
            onChange?.(e)
        }

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                    </label>
                )}
                <textarea
                    className={cn(
                        'flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none overflow-hidden',
                        error && 'border-red-400 focus:ring-red-500/20 focus:border-red-400',
                        className
                    )}
                    style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
                    ref={internalRef}
                    onChange={handleChange}
                    onInput={adjustHeight}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        )
    }
)
Textarea.displayName = 'Textarea'
