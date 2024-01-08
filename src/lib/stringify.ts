function isObject(value: unknown): value is Object {
    return Boolean(value && typeof value === 'object')
}

export function stringify(value: unknown): string {
    if (!isObject(value)) {
        return String(value)
    }

    const seen = new Set<unknown>()

    return JSON.stringify(value, (_key, value) => {
        if (isObject(value)) {
            if (seen.has(value)) {
                return '[recursive]'
            }

            seen.add(value)
        }

        return value
    }, 4)
}
