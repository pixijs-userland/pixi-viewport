/** Small seeded random number generator (mulberry32), so the demo world looks the same on every load */
export class Random
{
    private state: number;

    constructor(seed = 1)
    {
        this.state = seed >>> 0;
    }

    /** Returns a number in [0, 1) */
    next(): number
    {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let t = this.state;

        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Returns a number in [min, max) */
    range(min: number, max: number): number
    {
        return min + (this.next() * (max - min));
    }

    /** Returns true with the given probability */
    chance(probability: number): boolean
    {
        return this.next() < probability;
    }

    /** Returns an item from the list */
    pick<T>(list: readonly T[]): T
    {
        return list[Math.floor(this.next() * list.length)];
    }
}

/** Colors used throughout the demo; readable on both light and dark backgrounds */
export const PALETTE = [
    0xe91e63, 0x9c27b0, 0x3f51b5, 0x03a9f4, 0x009688, 0x8bc34a, 0xffc107, 0xff5722, 0x607d8b,
] as const;
