interface ToggleProps {
    checked: boolean
    onChange: (value: boolean) => void
    label?: string
    description?: string
    disabled?: boolean
}

export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
    return (
        <label className="flex items-center gap-3 cursor-pointer group">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={[
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    checked ? 'bg-green-600' : 'bg-gray-200',
                ].join(' ')}
            >
                <span
                    className={[
                        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform',
                        checked ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                />
            </button>
            {(label || description) && (
                <span className="flex flex-col">
                    {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
                    {description && <span className="text-xs text-gray-500">{description}</span>}
                </span>
            )}
        </label>
    )
}
