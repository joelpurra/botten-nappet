// "Boundary" by Thomas Darling.
// https://github.com/thomas-darling
// https://github.com/aurelia/dependency-injection/issues/45
// https://github.com/aurelia/dependency-injection/issues/45#issuecomment-239788622
//
// NOTE: modified by Joel Purra (https://joelpurra.com/).
// NOTE: automatically fails if used to resolve a dependency, preventing parent lookups.
// NOTE: Should be used as a hard boundary to prevent Aurelia to auto-register dependencies as singletons on the root container.

import { Container, Resolver, resolver, getDecoratorDependencies } from "aurelia-framework";

/**
 * Decorator: Specifies the container should be a boundary to any child containers.
 */
export function boundary(keyValue: any) {
    return function (target: any, _key: any, index: number) {
        let params = getDecoratorDependencies(target, "boundary");
        params[index] = Boundary.of(keyValue);
    };
}

/**
 * Used to allow functions/classes to parent resolution boundary logic.
 */
@resolver()
export class Boundary implements Resolver {
    private _key: any;

    /**
     * Creates an instance of the Boundary class.
     * @param key The key to resolve.
     */
    public constructor(key: any) {
        this._key = key;
    }

    /**
     * Creates a Boundary Resolver for the supplied key.
     * @param key The key to resolve.
     * @return Returns an instance of Boundary for the key.
     */
    public static of(key: any): Boundary {
        return new Boundary(key);
    }

    /**
     * Called by the container to load the dependency from the current container, but will always fail.
     * @param container The container to resolve from.
     * @return Nothing. Will always throw an error.
     */
    public get(_container: Container): any {
        throw new Error(`Reached resolver lookup boundary for container and key: ${this._key}`)
    }
}
