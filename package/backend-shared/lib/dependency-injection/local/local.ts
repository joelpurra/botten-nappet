// "Scoped" by Thomas Darling.
// https://github.com/thomas-darling
// https://github.com/aurelia/dependency-injection/issues/45
// https://github.com/aurelia/dependency-injection/issues/45#issuecomment-239788622
//
// NOTE: modified by Joel Purra (https://joelpurra.com/).
// NOTE: only checks the n levels of containers when resolving.

import { Container, Resolver, resolver, getDecoratorDependencies } from "aurelia-framework";

/**
 * Decorator: Specifies the dependency should be in the current container (n=1) or in one of the parent containers (n > 1).
 */
export function levels(keyValue: any, levels: number) {
    if (Math.floor(levels) !== Math.ceil(levels)) {
        throw new Error(`Out of range: levels (${levels})`);
    }

    if (levels <= 0) {
        throw new Error(`Out of range: levels (${levels})`);
    }

    return function (target: any, _key: any, index: number) {
        let params = getDecoratorDependencies(target, "levels");
        params[index] = Levels.of(keyValue, levels);
    };
}

/**
 * Used to allow functions/classes to specify level resolution logic.
 */
@resolver()
export class Levels implements Resolver {
    private _key: any;
    private _levels: number;

    /**
     * Creates an instance of the Levels class.
     * @param key The key to resolve.
     */
    public constructor(key: any, levels: number) {
        if (Math.floor(levels) !== Math.ceil(levels)) {
            throw new Error(`Out of range: levels (${levels})`);
        }

        if (levels <= 0) {
            throw new Error(`Out of range: levels (${levels})`);
        }

        this._key = key;
        this._levels = levels;
    }

    /**
     * Creates a Levels Resolver for the supplied key.
     * @param key The key to resolve.
     * @return Returns an instance of Levels for the key.
     */
    public static of(key: any, levels: number): Levels {
        return new Levels(key, levels);
    }

    /**
     * Called by the container to load the dependency from the current container
     * @param container The container to resolve from.
     * @return Returns a level instance in the current container.
     */
    public get(container: Container): any {
        let lookupContainer = container;

        for (let i = 0; i < this._levels && lookupContainer !== null; i++ , lookupContainer = lookupContainer.parent) {
            if (lookupContainer.hasResolver(this._key, false)) {
                return lookupContainer.get(this._key);
            }
        }

        throw new Error(`Could not resolve key "${this._key}" within ${this._levels} from "${container}".`);
    }
}
