import { cn } from '../../lib/cn'
import s from './index.module.css'

export interface ButtonProps {
    text?: string
    onClick?: () => void
    red?: boolean
}

export function Button({
    text,
    onClick,
    red,
}: ButtonProps) {
    return (
        <button
            className={cn(s.Button, red && s.Red)}
            onClick={onClick}
        >{text}</button>
    )
}
