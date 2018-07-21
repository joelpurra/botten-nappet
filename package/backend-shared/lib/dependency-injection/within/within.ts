// "Scoped" by Thomas Darling.
// https://github.com/thomas-darling
// https://github.com/aurelia/dependency-injection/issues/45
// https://github.com/aurelia/dependency-injection/issues/45#issuecomment-239788622
//
// NOTE: modified by Joel Purra (https://joelpurra.com/).
// NOTE: only checks within the context (named child container) when resolving.

const CONTAINER_CONTEXT_IDENTIFIER = "containerContextIdentifier";

import { Container, Resolver, resolver, getDecoratorDependencies } from "aurelia-framework";

/**
 * Decorator: Specifies the dependency should be resolved within in the current context (named child container).
 */
export function within(keyValue: any, name: string) {
    if (!name || typeof name !== "string" || name.length === 0) {
        throw new Error(`Invalid name (${name})`);
    }

    return function (target: any, _key: any, index: number) {
        let params = getDecoratorDependencies(target, "within");
        params[index] = Within.of(keyValue, name);
    };
}

/**
 * Used to allow functions/classes to specify context resolution logic.
 */
@resolver()
export class Within implements Resolver {
    private _key: any;
    private _name: string;

    /**
     * Creates an instance of the Within class.
     * @param key The key to resolve.
     * @param name The name of the context.
     */
    public constructor(key: any, name: string) {
        if (!name || typeof name !== "string" || name.length === 0) {
            throw new Error(`Invalid name (${name})`);
        }

        this._key = key;
        this._name = `context:${name}`;
    }

    /**
     * Creates a Within Resolver for the supplied key.
     * @param key The key to resolve.
     * @param name The name of the context.
     * @return Returns an instance of Within for the key.
     */
    public static of(key: any, name: string): Within {
        return new Within(key, name);
    }

    /**
     * Called by the container to load the dependency from the current container
     * @param container The container to resolve from.
     * @return Returns an instance within the context (named child container).
     */
    public get(container: Container): any {
        let lookupContainer = container;
        const parentContexts: (string | null)[] = [];

        do {
            if (lookupContainer.hasResolver(this._key, false)) {
                return lookupContainer.get(this._key);
            }

            if (lookupContainer.hasResolver(CONTAINER_CONTEXT_IDENTIFIER, false)) {
                const containerContextIdentifier = lookupContainer.get(CONTAINER_CONTEXT_IDENTIFIER);
                parentContexts.push(containerContextIdentifier);

                // TODO: function for the context prefix.
                if (containerContextIdentifier === this._name) {
                    lookupContainer.registerSingleton(this._key);
                    return lookupContainer.get(this._key);
                }
            } else {
                parentContexts.push("context:null");
            }

            lookupContainer = lookupContainer.parent;
        } while (lookupContainer !== null)

        throw new Error(
            `Could not resolve key "${
            this._key
            }" within ${
            this._name
            } from "${
            container
            } with parent contexts (${
            parentContexts.join(", ")
            })".`
        );
    }
}
