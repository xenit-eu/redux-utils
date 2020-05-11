import { Store, Selector, Unsubscribe } from '@reduxjs/toolkit';
import invariant from 'tiny-invariant';

type ChangeHandler<T> = (newValue: T, oldValue: T) => void;

// Copied and simplified from https://github.com/jprichardson/redux-watch/blob/master/index.js
function watch<R>(
    getState: () => R
): (handler: ChangeHandler<R>) => () => void {
    let currentValue = getState();
    return (handler: ChangeHandler<R>) => () => {
        let newValue = getState();
        if (currentValue !== newValue) {
            let oldValue = currentValue;
            currentValue = newValue;
            handler(newValue, oldValue);
        }
    };
}

/**
 * An unbound watcher for a slice of store state
 *
 * @param store The store to subscribe the watcher to
 * @returns An unsubscribe function
 */
type StoreWatcher<S extends Store> = (store: S) => Unsubscribe;

/**
 * Creates a 'watcher' for a slice of the store
 *
 * @param selector Selector function that selects a slice of the state of the store
 * @param handler Change handler that will be called when the slice changes
 *
 * @returns An unbound watcher for the state returned by selector
 */
export function createWatcher<State, R, S extends Store<State> = Store<State>>(
    selector: Selector<State, R>,
    handler: ChangeHandler<R>
): StoreWatcher<S> {
    let registered = false;
    return store => {
        invariant(
            !registered,
            'A watcher can only be subscribed to the store once.'
        );
        const watcher = watch(() => selector(store.getState()));
        const unsubscribe = store.subscribe(watcher(handler));
        registered = true;
        return () => {
            unsubscribe();
            registered = false;
        };
    };
}

/**
 * Combines multiple watchers into a watcher that subscribes/unsubscribes all watchers at once
 * @param watchers Watchers to combine
 *
 * @return An unbound watcher for all watchers
 */
export function combineWatchers<S extends Store>(
    ...watchers: ReadonlyArray<StoreWatcher<S>>
): StoreWatcher<S> {
    return store => {
        const unsubscribe = watchers.map(w => w(store));
        return () => unsubscribe.forEach(u => u());
    };
}
