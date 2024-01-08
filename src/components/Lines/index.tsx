import s from './index.module.css'

const MAX_LINE_N = 99999

export interface LinesProps {
    linesN: number
    activeLineIndex: number
}

export function Lines({
    linesN,
    activeLineIndex,
}: LinesProps) {
    return (
        <div className={s.Lines}>
            {Array.from(Array(linesN), (_, index) => (
                <div
                    key={index}
                    className={index === activeLineIndex ? s.Active : undefined}
                >{Math.min(MAX_LINE_N, index + 1)}</div>
            ))}
        </div>
    )
}
