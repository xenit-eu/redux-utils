import { Store, Selector, Unsubscribe, Dispatch } from '@reduxjs/toolkit';
import debug from 'debug';
import StacktraceJs from 'stacktrace-js';

const log = debug('redux-utils:watcher');

type SimpleChangeListener<T> = (newValue: T, oldValue: T) => void;

// Copied and simplified from https://github.com/jprichardson/redux-watch/blob/master/index.js
function watch<R>(
    getState: () => R
): (handler: SimpleChangeListener<R>) => () => void {
    let currentValue = getState();
    return (handler: SimpleChangeListener<R>) => () => {
        let newValue = getState();
        if (currentValue !== newValue) {
            let oldValue = currentValue;
            currentValue = newValue;
            handler(newValue, oldValue);
        }
    };
}

/**
 * Extra data for a change listener
 */
interface ChangeListenerExtra<S extends Store> {
    /**
     * The store on which the change listerner was triggered
     */
    store: S;
    /**
     * Dispatch method of the store
     */
    dispatch: Dispatch;
}

/**
 * A change listener.
 *
 * @param newValue The new value that is now in the store
 * @param oldValue The previous value that was in the store
 * @param extra Additional data for the change listener
 */
type ChangeListener<T, S extends Store> = (
    newValue: T,
    oldValue: T,
    extra: ChangeListenerExtra<S>
) => void;

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
 * @param listener Change listener that will be called when the slice changes
 *
 * @returns An unbound watcher for the state returned by selector
 */
export function createWatcher<State, R, S extends Store<State> = Store<State>>(
    selector: Selector<State, R>,
    listener: ChangeListener<R, S>
): StoreWatcher<S> {
    let caller = '<unknown>';
    if (log.enabled) {
        const backtrace = StacktraceJs.getSync();
        caller = backtrace[1].toString();
    }
    return store => {
        const watcher = watch(() => selector(store.getState()));
        const opts: ChangeListenerExtra<S> = {
            store: store,
            dispatch: store.dispatch.bind(store),
        };
        return store.subscribe(
            watcher((newValue, oldValue) => {
                log(
                    'Watcher [created by %s] (selector=%O) changed: %O => %O',
                    caller,
                    selector,
                    oldValue,
                    newValue
                );
                listener(newValue, oldValue, opts);
            })
        );
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
