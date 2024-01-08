import s from './index.module.css'
import { cn } from '../../lib/cn'

export type ListDropdownValue = string | number

export interface ListDropdownOption<T> {
    text: string
    value: T
}

export interface ListDropdownProps<T> {
    options: ListDropdownOption<T>[]
    value: T
    onChange: (value: string) => void
    disabled?: boolean
    waiting?: boolean
}

export function ListDropdown<T extends ListDropdownValue>({
    options,
    value,
    onChange,
    disabled,
    waiting,
}: ListDropdownProps<T>) {
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={event => onChange(event.target.value)}
            className={cn(s.Select, waiting && s.Waiting)}
        >
            {options.map(({
                text,
                value,
            }) => (
                <option key={value} value={value}>{text}</option>
            ))}
        </select>
    )
}
