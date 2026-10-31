import { version } from '../../../package.json';

/** Fills in the version shown in the header */
export function header(): void
{
    for (const element of document.querySelectorAll('[data-version]'))
    {
        element.textContent = `v${version}`;
    }
}
