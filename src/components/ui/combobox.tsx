import * as React from 'react'
import { Check, ChevronDown, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  emptyMessage?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export const Combobox: React.FC<ComboboxProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Buscar o escribir categoría...',
  emptyMessage = 'No hay coincidencias en la lista.',
  required = false,
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false)
  const [isFiltering, setIsFiltering] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listboxId = React.useId()

  // Cerrar al hacer clic fuera del componente
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setIsFiltering(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const normalizedQuery = normalizeSearchText(value)

  const filteredOptions = React.useMemo(() => {
    if (!isFiltering || !normalizedQuery) {
      return options
    }
    return options.filter((opt) => normalizeSearchText(opt).includes(normalizedQuery))
  }, [options, isFiltering, normalizedQuery])

  const hasExactMatch = React.useMemo(() => {
    if (!normalizedQuery) return true
    return options.some((opt) => normalizeSearchText(opt) === normalizedQuery)
  }, [options, normalizedQuery])

  const showCustomOption = Boolean(value.trim()) && !hasExactMatch
  const totalItems = filteredOptions.length + (showCustomOption ? 1 : 0)

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
    setIsFiltering(false)
    setHighlightedIndex(-1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setIsFiltering(true)
    setOpen(true)
    setHighlightedIndex(0)
  }

  const handleClear = () => {
    onChange('')
    setIsFiltering(false)
    setOpen(true)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlightedIndex(0)
      } else if (totalItems > 0) {
        setHighlightedIndex((prev) => (prev + 1) % totalItems)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlightedIndex(Math.max(0, totalItems - 1))
      } else if (totalItems > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1))
      }
    } else if (e.key === 'Enter' && open) {
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault()
        handleSelectOption(filteredOptions[highlightedIndex])
      } else if (showCustomOption && highlightedIndex === filteredOptions.length) {
        e.preventDefault()
        handleSelectOption(value.trim())
      } else if (value.trim()) {
        // Permite confirmar texto libre con Enter si no hay opción seleccionada
        e.preventDefault()
        handleSelectOption(value.trim())
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setIsFiltering(false)
      setHighlightedIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          required={required}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true)
            setIsFiltering(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-16 py-2 text-sm text-foreground shadow-xs transition-colors',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar categoría"
              className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              setOpen((prev) => !prev)
              setIsFiltering(false)
              inputRef.current?.focus()
            }}
            aria-label="Desplegar categorías"
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            <ChevronDown
              className={cn('w-4 h-4 transition-transform duration-150', open && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="p-1 space-y-0.5">
            {filteredOptions.length === 0 && !showCustomOption && (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                {emptyMessage}
              </div>
            )}

            {filteredOptions.map((option, idx) => {
              const isSelected = normalizeSearchText(option) === normalizedQuery
              const isHighlighted = idx === highlightedIndex
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelectOption(option)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left text-xs transition-colors cursor-pointer',
                    isHighlighted
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/70 hover:text-accent-foreground',
                    isSelected && 'font-semibold text-foreground'
                  )}
                >
                  <span className="truncate">{option}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />}
                </button>
              )
            })}

            {showCustomOption && (
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                onClick={() => handleSelectOption(value.trim())}
                className={cn(
                  'w-full flex items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs border-t border-border/60 mt-1 pt-2 transition-colors cursor-pointer',
                  highlightedIndex === filteredOptions.length
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/70 text-foreground'
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                <span className="truncate">
                  Usar categoría personalizada:{' '}
                  <strong className="font-bold">&quot;{value.trim()}&quot;</strong>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
