// NOTE: based on answer by Brandon, but upgraded to RxJS v6.0.0-smoosh.2.
// https://stackoverflow.com/questions/28490700/is-there-an-async-version-of-filter-operator-in-rxjs
// https://stackoverflow.com/a/28561930
// https://stackoverflow.com/users/674326/brandon

import {
    from,
    MonoTypeOperatorFunction,
    ObservableInput,
} from "rxjs";

import {
    concatMap,
    filter,
    flatMap,
    map,
} from "rxjs/operators";

// NOTE: runs the filters in parallel (order not guaranteed).
export function flatFilter<T>(
    // Predicate should return an Observable.
    predicate: (value: T, index: number) => ObservableInput<boolean>,
): MonoTypeOperatorFunction<T> {
    return flatMap(
        (value, index) => from(predicate(value, index))
            // NOTE: filter falsy values.
            .pipe(filter(Boolean))
            .pipe(map(() => value)),
    );
}

// NOTE: runs the filters sequentially (order preserved).
export function concatFilter<T>(
    // Predicate should return an Observable.
    predicate: (value: T, index: number) => ObservableInput<boolean>,
): MonoTypeOperatorFunction<T> {
    return concatMap(
        (value, index) => from(predicate(value, index))
            // NOTE: filter falsy values.
            .pipe(filter(Boolean))
            .pipe(map(() => value)),
    );
}
