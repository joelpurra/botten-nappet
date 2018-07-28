// "Scoped" by Thomas Darling.
// https://github.com/thomas-darling
// https://github.com/aurelia/dependency-injection/issues/45
// https://github.com/aurelia/dependency-injection/issues/45#issuecomment-239788622
//
// NOTE: modified by Joel Purra (https://joelpurra.com/).
// NOTE: creates a child container before resolving.

import { Container, Resolver, resolver, getDecoratorDependencies } from "aurelia-framework";

/**
 * Decorator: Specifies the dependency should be contained to a new child of the current container.
 */
export function contained(keyValue: any) {
    return function (target: any, key: any, index: number) {
        let params = getDecoratorDependencies(target, "contained");
        params[index] = Contained.of(keyValue);
    };
}

/**
 * Used to allow functions/classes to specify contained resolution logic.
 */
@resolver()
export class Contained implements Resolver {
    private _key: any;

    /**
     * Creates an instance of the Contained class.
     * @param key The key to resolve.
     */
    public constructor(key: any) {
        this._key = key;
    }

    /**
     * Creates a Contained Resolver for the supplied key.
     * @param key The key to resolve.
     * @return Returns an instance of Contained for the key.
     */
    public static of(key: any): Contained {
        return new Contained(key);
    }

    /**
     * Called by the container to load the dependency from the current container
     * @param container The container to resolve from.
     * @return Returns an instance contained to a new child of the current container.
     */
    public get(container: Container): any {
        const childContainer = container.createChild();

        childContainer.registerSingleton(this._key);

        return childContainer.get(this._key);
    }
}
