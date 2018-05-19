// https://stackoverflow.com/questions/28490700/is-there-an-async-version-of-filter-operator-in-rxjs
// https://stackoverflow.com/a/28561930/907779

// tslint:disable:only-arrow-functions
// tslint:disable:space-before-function-paren

import Rx from "rxjs";

// runs the filters in parallel (order not guaranteed)
// predicate should return an Observable
Rx.Observable.prototype.flatFilter = function (predicate) {
    return this.flatMap(function (value, index) {
        return predicate(value, index)
            .filter(Boolean) // filter falsy values
            .map(function () { return value; });
    });
};

// runs the filters sequentially (order preserved)
// predicate should return an Observable
Rx.Observable.prototype.concatFilter = function (predicate) {
    return this.concatMap(function (value, index) {
        return predicate(value, index)
            .filter(Boolean) // filter falsy values
            .map(function () { return value; });
    });
};

// tslint:enable:space-before-function-paren
// tslint:enable:only-arrow-functions
