import { useEffect, useState, type ChangeEvent } from 'react'
import { formatCurrencyInput, parseCurrencyInput } from '../utils/materialReport'
import './CurrencyInput.css'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  id?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Input harga dengan format ribuan id-ID (contoh: 3.500.000).
 */
export function CurrencyInput({
  value,
  onChange,
  min = 0,
  id,
  className,
  disabled,
  'aria-label': ariaLabel,
}: Props) {
  const [text, setText] = useState(() => formatCurrencyInput(value))

  useEffect(() => {
    setText(formatCurrencyInput(value))
  }, [value])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const parsed = parseCurrencyInput(raw)
    const next = min != null ? Math.max(min, parsed) : parsed
    setText(formatCurrencyInput(next))
    onChange(next)
  }

  const handleBlur = () => {
    setText(formatCurrencyInput(value))
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={className ? `currency-input ${className}` : 'currency-input'}
      value={text}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
