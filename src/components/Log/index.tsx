import s from './index.module.css'

export interface LogProps {
    text: string
}

export function Log({
    text,
}: LogProps) {
    return (
        <div className={s.Log}>
            {text}
        </div>
    )
}
