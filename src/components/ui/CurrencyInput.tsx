import { forwardRef, useState, useEffect } from 'react'
import { Input, type InputProps } from './Input'

interface CurrencyInputProps extends Omit<InputProps, 'onChange'> {
    value?: number
    onChange?: (value: number) => void
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ value, onChange, ...props }, ref) => {
        const [displayValue, setDisplayValue] = useState('')

        useEffect(() => {
            if (value !== undefined) {
                const num = Number(value)
                if (!isNaN(num)) {
                     setDisplayValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num))
                } else {
                     setDisplayValue('')
                }
            }
        }, [value])

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let val = e.target.value
            // Remove everything except numbers
            const digits = val.replace(/\D/g, '')
            if (!digits) {
                setDisplayValue('')
                onChange?.(0)
                return
            }

            const num = parseInt(digits, 10) / 100
            setDisplayValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num))
            onChange?.(num)
        }

        return (
            <Input
                {...props}
                ref={ref}
                type="text"
                value={displayValue}
                onChange={handleChange}
            />
        )
    }
)

CurrencyInput.displayName = 'CurrencyInput'
