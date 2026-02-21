import { forwardRef } from 'react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'
import { clsx } from 'clsx'

interface DeliveryTimeInputProps {
    label?: string
    value: number
    onChange: (value: number) => void
    error?: string
    className?: string
}

export const DeliveryTimeInput = forwardRef<HTMLInputElement, DeliveryTimeInputProps>(
    ({ label, value, onChange, error, className }, ref) => {
        const increment = () => onChange(value + 1)
        const decrement = () => onChange(Math.max(1, value - 1))

        return (
            <div className={clsx("w-full", className)}>
                {label && (
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    <div className="relative flex-1">
                        <input
                            ref={ref}
                            type="number"
                            value={value}
                            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                            className={clsx(
                                'flex h-10 w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 pr-28 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all',
                                error && 'border-red-500/50 focus:ring-red-500/50'
                            )}
                        />
                        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                            <span className="text-sm text-neutral-500 font-medium select-none">dias úteis</span>
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center bg-neutral-800 border border-neutral-700 rounded-md divide-y divide-neutral-700">
                            <button
                                type="button"
                                onClick={increment}
                                className="p-0.5 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors rounded-t-md"
                            >
                                <CaretUp size={14} weight="bold" />
                            </button>
                            <button
                                type="button"
                                onClick={decrement}
                                className="p-0.5 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors rounded-b-md"
                            >
                                <CaretDown size={14} weight="bold" />
                            </button>
                        </div>
                    </div>
                </div>
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        )
    }
)

DeliveryTimeInput.displayName = 'DeliveryTimeInput'
