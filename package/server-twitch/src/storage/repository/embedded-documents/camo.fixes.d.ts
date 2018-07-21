declare namespace NodeJS {
    export interface Global {
        // TODO: fix upstream @types/camo.
        CLIENT: any;
    }
}

declare module "camo" {
    // TODO: fix upstream @types/camo.
    export const EmbeddedDocument: {
        new(): EmbeddedDocument
    };

    export interface IDatabaseConnection {
        _collections: {
            [collectionName: string]: ICollection
        }
        close: () => void;
    }


    export function connect(uri: string): IDatabaseConnection;
}
