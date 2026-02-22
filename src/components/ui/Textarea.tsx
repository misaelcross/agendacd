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

        // Merge refs - handle both callback ref and ref object
        useImperativeHandle(ref, () => internalRef.current!)

        const adjustHeight = useCallback(() => {
            const textarea = internalRef.current
            if (textarea && autoExpand) {
                // Reset height to get the correct scrollHeight
                textarea.style.height = 'auto'
                // Calculate new height, limited by maxHeight but at least minHeight
                const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
                textarea.style.height = `${newHeight}px`
                // Enable scroll if content exceeds maxHeight
                textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
            }
        }, [autoExpand, maxHeight, minHeight])

        // Adjust height on mount and when value changes externally
        useEffect(() => {
            if (autoExpand) {
                // Small timeout to ensure the textarea is rendered
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
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                        {label}
                    </label>
                )}
                <textarea
                    className={cn(
                        'flex w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none overflow-hidden',
                        error && 'border-red-500/50 focus:ring-red-500/50',
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
