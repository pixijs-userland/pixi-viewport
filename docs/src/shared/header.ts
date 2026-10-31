import { version } from '../../../package.json';
import { themeToggle } from './theme';

/** Fills in the version shown in the header and sets up the theme switch */
export function header(): void
{
    themeToggle();

    for (const element of document.querySelectorAll('[data-version]'))
    {
        element.textContent = `v${version}`;
    }
}
