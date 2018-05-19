// "Scoped" by Thomas Darling.
// https://github.com/thomas-darling
// https://github.com/aurelia/dependency-injection/issues/45
// https://github.com/aurelia/dependency-injection/issues/45#issuecomment-239788622
//
// NOTE: modified by Joel Purra (https://joelpurra.com/).
// NOTE: creates a context (named child container) before resolving.

const CONTAINER_CONTEXT_IDENTIFIER = "containerContextIdentifier";

import { Container, Resolver, resolver, getDecoratorDependencies } from "aurelia-framework";

/**
 * Decorator: Specifies the dependency denotes a new context (named child of the current container).
 */
export function context(keyValue: any, name: string) {
    if (!name || typeof name !== "string" || name.length === 0) {
        throw new Error(`Invalid name (${name})`);
    }

    return function (target: any, key: any, index: number) {
        let params = getDecoratorDependencies(target, "context");
        params[index] = Context.of(keyValue, name);
    };
}

/**
 * Used to allow functions/classes to specify context resolution logic.
 */
@resolver()
export class Context implements Resolver {
    private _key: any;
    private _name: string;

    /**
     * Creates an instance of the Context class.
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
     * Creates a Context Resolver for the supplied key.
     * @param key The key to resolve.
     * @param name The name of the context.
     * @return Returns an instance of Context for the key.
     */
    public static of(key: any, name: string): Context {
        return new Context(key, name);
    }

    /**
     * Called by the context to load the dependency from the current container
     * @param container The container to resolve from.
     * @return Returns an instance within the current context.
     */
    public get(container: Container): () => any {
        const childContainer = container.createChild();

        childContainer.registerInstance(CONTAINER_CONTEXT_IDENTIFIER, this._name);

        // TODO: keep a list of active contexts.
        // TODO: unregister the context at some point.
        //container.root.registerInstance(containerContextIdentifier, this._key);
        //container.root.unregister(containerContextIdentifier);
        childContainer.registerSingleton(this._key);

        const factory = () => {
            return childContainer.get(this._key);
        };

        return factory;
    }
}
