import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'
import { clsx } from 'clsx'

interface SearchableSelectProps {
    label?: string
    placeholder?: string
    options: string[]
    value: string
    onChange: (value: string) => void
    error?: string
    className?: string
}

export const SearchableSelect = forwardRef<HTMLInputElement, SearchableSelectProps>(
    ({ label, placeholder, options, value, onChange, error, className }, ref) => {
        const [isOpen, setIsOpen] = useState(false)
        const [searchTerm, setSearchTerm] = useState(value)
        const containerRef = useRef<HTMLDivElement>(null)
        const inputRef = useRef<HTMLInputElement>(null)

        useImperativeHandle(ref, () => inputRef.current!)

        useEffect(() => {
            setSearchTerm(value)
        }, [value])

        useEffect(() => {
            function handleClickOutside(event: MouseEvent) {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false)
                }
            }
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }, [])

        const filteredOptions = options.filter(option =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        )

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setSearchTerm(val)
            onChange(val)
            setIsOpen(true)
        }

        const handleOptionClick = (option: string) => {
            onChange(option)
            setSearchTerm(option)
            setIsOpen(false)
        }

        return (
            <div className={clsx("w-full relative", className)} ref={containerRef}>
                {label && (
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={handleInputChange}
                        onFocus={() => setIsOpen(true)}
                        className={clsx(
                            'flex h-10 w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all',
                            error && 'border-red-500/50 focus:ring-red-500/50'
                        )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <CaretDown size={18} />
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 && filteredOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleOptionClick(option)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-800 flex items-center justify-between group transition-colors"
                            >
                                <span className={clsx(value === option ? "text-blue-500 font-medium" : "text-neutral-300")}>
                                    {option}
                                </span>
                                {value === option && <Check size={16} className="text-blue-600" />}
                            </button>
                        ))}

                        {searchTerm && !options.includes(searchTerm) && (
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full text-left px-4 py-2 text-sm text-blue-500 hover:bg-blue-500/10 font-medium border-t border-neutral-800"
                            >
                                <span className="flex items-center gap-2">
                                    Usar personalizado: "{searchTerm}"
                                </span>
                            </button>
                        )}

                        {filteredOptions.length === 0 && !searchTerm && (
                            <div className="px-4 py-2 text-sm text-gray-500 italic">
                                Nenhuma opção encontrada
                            </div>
                        )}
                    </div>
                )}
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        )
    }
)

SearchableSelect.displayName = 'SearchableSelect'
