export function random(mn: number, mx: number): number {
    const delta = mx - mn;
    return Math.random() * delta + mn;
}
