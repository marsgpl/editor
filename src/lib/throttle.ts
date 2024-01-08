export function throttle<T extends Array<unknown>>(func: Function, delayMs: number) {
    let throttled = false

    return (...args: T) => {
        if (throttled) { return }

        func(args)

        throttled = true

        setTimeout(() => {
            throttled = false
        }, delayMs)
    }
}
