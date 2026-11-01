/**
 * Light/dark theme switch. Uses the same storage key and `data-theme` values as the TypeDoc API docs
 * ('os', 'light', 'dark'), so a choice made on either part of the site carries over to the other.
 */

export type ThemeSetting = 'os' | 'light' | 'dark';

const STORAGE_KEY = 'tsd-theme';
const ORDER: ThemeSetting[] = ['os', 'light', 'dark'];
const LABELS: Record<ThemeSetting, string> = { os: 'Auto', light: 'Light', dark: 'Dark' };
const ICONS: Record<ThemeSetting, string> = { os: '◐', light: '☀', dark: '☾' };

const listeners = new Set<() => void>();
const media = window.matchMedia('(prefers-color-scheme: dark)');

/** The stored setting ('os' follows the operating system) */
export function themeSetting(): ThemeSetting
{
    try
    {
        const value = localStorage.getItem(STORAGE_KEY);

        if (value === 'light' || value === 'dark' || value === 'os')
        {
            return value;
        }
    }
    catch
    {
        // storage can be unavailable (private windows, blocked site data)
    }

    return 'os';
}

/** Whether the page is currently showing the dark theme */
export function isDarkTheme(): boolean
{
    const setting = themeSetting();

    return setting === 'dark' || (setting === 'os' && media.matches);
}

/** Calls `callback` whenever the visible theme changes. Returns a function that stops listening. */
export function onThemeChange(callback: () => void): () => void
{
    listeners.add(callback);

    return () => listeners.delete(callback);
}

function notify(): void
{
    for (const listener of listeners)
    {
        listener();
    }
}

function setTheme(setting: ThemeSetting): void
{
    try
    {
        localStorage.setItem(STORAGE_KEY, setting);
    }
    catch
    {
        // the switch still works for this page without storage
    }
    document.documentElement.dataset.theme = setting;
    notify();
}

media.addEventListener('change', () =>
{
    if (themeSetting() === 'os')
    {
        notify();
    }
});

/** Wires up the header button that cycles Auto → Light → Dark */
export function themeToggle(): void
{
    const button = document.querySelector<HTMLButtonElement>('.theme-toggle');

    if (!button)
    {
        return;
    }

    const render = (): void =>
    {
        const setting = (document.documentElement.dataset.theme as ThemeSetting) ?? themeSetting();
        const next = ORDER[(ORDER.indexOf(setting) + 1) % ORDER.length];

        button.innerHTML = `<span aria-hidden="true">${ICONS[setting]}</span><span class="label">${LABELS[setting]}</span>`;
        button.setAttribute('aria-label', `Theme: ${LABELS[setting]}. Switch to ${LABELS[next]}.`);
        button.title = `Theme: ${LABELS[setting]} (click for ${LABELS[next]})`;
    };

    button.addEventListener('click', () =>
    {
        const current = themeSetting();

        setTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
        render();
    });
    render();
}
