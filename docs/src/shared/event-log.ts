import type { Viewport } from 'pixi-viewport';

/** Viewport events shown in the log (moved and zoomed fire every frame, so they're left out) */
const EVENTS = [
    'clicked',
    'drag-start',
    'drag-end',
    'pinch-start',
    'pinch-end',
    'wheel-start',
    'snap-start',
    'snap-end',
    'snap-zoom-start',
    'snap-zoom-end',
    'bounce-x-start',
    'bounce-x-end',
    'bounce-y-start',
    'bounce-y-end',
    'edge-scroll-start',
    'edge-scroll-end',
    'animate-end',
    'moved-end',
    'zoomed-end',
] as const;

const MAX_ENTRIES = 40;

/** Lists viewport events as they fire. Repeated events (like wheel-start) are collapsed with a count. */
export function eventLog(viewport: Viewport, list: HTMLOListElement): void
{
    const empty = document.createElement('li');

    empty.className = 'empty';
    empty.textContent = 'Interact with the viewport to see its events.';
    list.appendChild(empty);

    let lastName = '';
    let lastItem: HTMLLIElement | null = null;
    let repeat = 1;

    function add(name: string, detail: string): void
    {
        empty.remove();
        if (name === lastName && lastItem)
        {
            repeat++;
            (lastItem.querySelector('.detail') as HTMLElement).textContent = `${detail} ×${repeat}`;

            return;
        }

        const item = document.createElement('li');
        const label = document.createElement('span');
        const info = document.createElement('span');

        label.textContent = name;
        info.className = 'detail';
        info.textContent = detail;
        item.append(label, info);
        list.prepend(item);
        while (list.children.length > MAX_ENTRIES)
        {
            list.lastElementChild?.remove();
        }
        lastName = name;
        lastItem = item;
        repeat = 1;
    }

    for (const name of EVENTS)
    {
        viewport.on(name, (data: unknown) =>
        {
            const world = (data as { world?: { x: number, y: number } })?.world;

            add(name, world ? `${Math.round(world.x)}, ${Math.round(world.y)}` : '');
        });
    }
}
