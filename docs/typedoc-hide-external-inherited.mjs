// @ts-check
import { Converter, ReflectionKind } from 'typedoc';

/**
 * Removes members a class inherits from outside this project. Viewport extends pixi's Container, which brings in
 * hundreds of members that pixi already documents; they would bury Viewport's own API. Members inherited from
 * classes in this project (like Plugin) are kept.
 *
 * @param {import('typedoc').Application} app
 */
export function load(app)
{
    app.converter.on(Converter.EVENT_RESOLVE_END, (context) =>
    {
        const project = context.project;

        for (const reflection of project.getReflectionsByKind(ReflectionKind.Class | ReflectionKind.Interface))
        {
            const children = /** @type {import('typedoc').DeclarationReflection} */ (reflection).children ?? [];

            for (const child of [...children])
            {
                // inherited from outside the project: after resolving, references to project classes have a
                // reflection and external ones (pixi's Container) don't
                if (child.inheritedFrom && !child.inheritedFrom.reflection)
                {
                    project.removeReflection(child);
                }
            }
        }
    });
}
