/*
This file is part of botten-nappet -- a Twitch bot and streaming tool.
<https://joelpurra.com/projects/botten-nappet/>

Copyright (c) 2018 Joel Purra <https://joelpurra.com/>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// NOTE: based on example in the official typescript documentation.
// http://www.typescriptlang.org/docs/handbook/decorators.html#parameter-decorators

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

import {
    assert,
} from "check-types";

const asrtAssignedMetadataSymbol = Symbol("asrt:assigned");
const asrtAssignedMetadataConstructorSymbol = Symbol("asrt:assigned:constructor");

function getAsrtPropertyKey(propertyKey: string | symbol) {
    return propertyKey || asrtAssignedMetadataConstructorSymbol;
}

function assertAsrtAssignedMetadata(target: Object, propertyKey: string | symbol, asrtDecoratorArgs: any[]) {
    const asrtAssignedParameters: number[]
        = Reflect.getOwnMetadata(asrtAssignedMetadataSymbol, target, propertyKey);

    if (asrtAssignedParameters) {
        for (const asrtAssignedParameterIndex of asrtAssignedParameters) {
            assert.inRange(asrtAssignedParameterIndex, 0, asrtDecoratorArgs.length);
            assert.assigned(asrtDecoratorArgs[asrtAssignedParameterIndex]);
        }
    }
}

function addAsrtAssignedMetadata(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    const existingRequiredParameters: number[]
        = Reflect.getOwnMetadata(asrtAssignedMetadataSymbol, target, propertyKey) || [];

    existingRequiredParameters.push(parameterIndex);

    Reflect.defineMetadata(asrtAssignedMetadataSymbol, existingRequiredParameters, target, propertyKey);
}

function asrtMethodDecorator(
    asrtMethodDecoratorArguments: any[],
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<Function>
) {
    const method = descriptor.value;
    const decoratedClassConstructorOrInstance = target;
    const numberOfMethodArguments = asrtMethodDecoratorArguments[0];

    if (!isNaN(numberOfMethodArguments)) {
        assert.number(numberOfMethodArguments);
        assert.integer(numberOfMethodArguments);
        assert.greaterOrEqual(numberOfMethodArguments, 0);
    }

    descriptor.value = function (...methodCallArgs: any[]) {
        if (!isNaN(numberOfMethodArguments)) {
            assert.hasLength(methodCallArgs, numberOfMethodArguments);
        }

        assertAsrtAssignedMetadata(decoratedClassConstructorOrInstance, propertyKey, methodCallArgs);

        // TODO: verify that method is always available.
        return method!.apply(this, methodCallArgs);
    };
}

function asrtParameterDecorator(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    const key = getAsrtPropertyKey(propertyKey);

    addAsrtAssignedMetadata(target, key, parameterIndex);
}

function asrtClassDecorator<T extends {
    new(...args: any[]): {
    };
}>(asrtClassDecoratorArguments: any[], target: T) {
    const decoratedClassConstructor = target;
    const numberOfConstructorArguments = asrtClassDecoratorArguments[0];

    if (!isNaN(numberOfConstructorArguments)) {
        assert.number(numberOfConstructorArguments);
        assert.integer(numberOfConstructorArguments);
        assert.greaterOrEqual(numberOfConstructorArguments, 0);
    }

    return class extends decoratedClassConstructor {
        constructor(...constructorArgs: any[]) {
            if (!isNaN(numberOfConstructorArguments)) {
                assert.hasLength(constructorArgs, numberOfConstructorArguments);
            }

            assertAsrtAssignedMetadata(target, asrtAssignedMetadataConstructorSymbol, constructorArgs);

            super(...constructorArgs);
        }
    };
}

export function asrt<T extends { new(...args: any[]): {} }>(...asrtDecoratorArgs: any[]): any {
    // TODO: clearly define return value types for different types of decorators.
    return function asrtDecorator(
        target: Object | T,
        propertyKey: string | symbol,
        parameterIndexOrDescriptor: number | TypedPropertyDescriptor<Function>,
    ) {
        // TODO: accessor decorator?
        // TODO: property decorator?
        if (arguments.length === 1 && typeof target === "function") {
            return asrtClassDecorator<T>(asrtDecoratorArgs, target);
        }

        if (typeof parameterIndexOrDescriptor === "number") {
            return asrtParameterDecorator(target, propertyKey, parameterIndexOrDescriptor);
        }

        return asrtMethodDecorator(asrtDecoratorArgs, target, propertyKey, parameterIndexOrDescriptor);
    };
}
