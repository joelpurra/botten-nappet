// "Scoped" by Thomas Darling.
// https://github.com/thomas-darling
// https://github.com/aurelia/dependency-injection/issues/45
// https://github.com/aurelia/dependency-injection/issues/45#issuecomment-239788622

import { Container, Resolver, resolver, getDecoratorDependencies } from "aurelia-framework";

/**
 * Decorator: Specifies the dependency should be scoped to the current container.
 */
export function scoped(keyValue: any) {
    return function (target, key, index) {
        let params = getDecoratorDependencies(target, "scoped");
        params[index] = Scoped.of(keyValue);
    };
}

/**
 * Used to allow functions/classes to specify scoped resolution logic.
 */
@resolver()
export class Scoped implements Resolver {
    private _key: any;

    /**
     * Creates an instance of the Scoped class.
     * @param key The key to resolve.
     */
    public constructor(key: any) {
        this._key = key;
    }

    /**
     * Creates a Scoped Resolver for the supplied key.
     * @param key The key to resolve.
     * @return Returns an instance of Scoped for the key.
     */
    public static of(key: any): Scoped {
        return new Scoped(key);
    }

    /**
     * Called by the container to load the dependency from the current container
     * @param container The container to resolve from.
     * @return Returns an instance scoped to the current container.
     */
    public get(container: Container): any {
        if (!container.hasResolver(this._key, false)) {
            container.registerSingleton(this._key);
        }

        return container.get(this._key);
    }
}
