import { createStore, createSlice, combineReducers } from '@reduxjs/toolkit';
import { createWatcher, combineWatchers } from '../watcher';

function setUp() {
    const counter = createSlice({
        initialState: 0,
        name: 'counter',
        reducers: {
            increment: state => state + 1,
            decrement: state => state - 1,
        },
    });

    const letter = createSlice({
        initialState: 'a',
        name: 'letter',
        reducers: {
            nextLetter: state => {
                const newString = String.fromCodePoint(
                    state.codePointAt(0)! + 1
                );
                return newString > 'z' ? 'a' : newString;
            },
        },
    });
    const reducer = combineReducers({
        counter: counter.reducer,
        letter: letter.reducer,
    });
    const store = createStore(reducer);

    return {
        ...counter.actions,
        ...letter.actions,
        counterSelector: (state: ReturnType<typeof reducer>) => state.counter,
        letterSelector: (state: ReturnType<typeof reducer>) => state.letter,
        store,
    };
}
describe('createWatcher', () => {
    it('Does not call the change handler when registering to the store', () => {
        const { store, counterSelector } = setUp();

        const changeHandler = jest.fn();

        const watcher = createWatcher(counterSelector, changeHandler);

        expect(changeHandler).not.toHaveBeenCalled();

        watcher(store);

        expect(changeHandler).not.toHaveBeenCalled();
    });

    it('Calls the change handler when the store changes', () => {
        const { store, counterSelector, increment } = setUp();

        const changeHandler = jest.fn();

        const watcher = createWatcher(counterSelector, changeHandler);
        watcher(store);

        expect(changeHandler).not.toHaveBeenCalled();

        store.dispatch(increment());

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenLastCalledWith(
            1,
            0,
            jasmine.anything()
        );

        store.dispatch(increment());

        expect(changeHandler).toHaveBeenCalledTimes(2);
        expect(changeHandler).toHaveBeenLastCalledWith(
            2,
            1,
            jasmine.anything()
        );
    });

    it('Does not respond when the watched slice does not change', () => {
        const { store, counterSelector, nextLetter } = setUp();

        const changeHandler = jest.fn();

        const watcher = createWatcher(counterSelector, changeHandler);

        watcher(store);
        store.dispatch(nextLetter());

        expect(changeHandler).not.toHaveBeenCalled();
    });

    it('Unsubscribes from the store when unsubscribe is called', () => {
        const { store, counterSelector, increment } = setUp();

        const changeHandler = jest.fn();

        const watcher = createWatcher(counterSelector, changeHandler);
        const unsubscribe = watcher(store);

        expect(changeHandler).not.toHaveBeenCalled();

        store.dispatch(increment());

        expect(changeHandler).toHaveBeenCalledTimes(1);

        unsubscribe();

        store.dispatch(increment());

        expect(changeHandler).toHaveBeenCalledTimes(1);
    });

    it('Can only be subscribed to the store once', () => {
        const { store, counterSelector } = setUp();

        const changeHandler = jest.fn();

        const watcher = createWatcher(counterSelector, changeHandler);

        watcher(store);

        expect(() => watcher(store)).toThrowError();
    });

    it('Can be subscribed again after it has been unsubscribed', () => {
        const { store, counterSelector, increment } = setUp();

        const changeHandler = jest.fn();

        const watcher = createWatcher(counterSelector, changeHandler);

        const unsubscribe = watcher(store);
        unsubscribe();

        expect(() => watcher(store)).not.toThrowError();

        store.dispatch(increment());

        expect(changeHandler).toHaveBeenCalledTimes(1);
    });

    it('Passes extra options to the change listener', () => {
        const { store, counterSelector, increment } = setUp();

        const changeHandler = jest.fn();
        const watcher = createWatcher(counterSelector, changeHandler);
        watcher(store);

        store.dispatch(increment());

        expect(changeHandler.mock.calls[0][2]).toHaveProperty('dispatch');
        expect(changeHandler.mock.calls[0][2].store).toBe(store);
    });
});

describe('combineWatchers', () => {
    it('Subscribes multiple watchers to the store', () => {
        const {
            store,
            counterSelector,
            letterSelector,
            increment,
            nextLetter,
        } = setUp();

        const counterChange = jest.fn();
        const letterChange = jest.fn();

        const counterWatcher = createWatcher(counterSelector, counterChange);
        const letterWatcher = createWatcher(letterSelector, letterChange);

        const watcher = combineWatchers(counterWatcher, letterWatcher);

        watcher(store);

        store.dispatch(increment());

        expect(counterChange).toHaveBeenCalledTimes(1);
        expect(counterChange).toHaveBeenCalledWith(1, 0, jasmine.anything());
        expect(letterChange).not.toHaveBeenCalled();

        store.dispatch(nextLetter());
        expect(letterChange).toHaveBeenCalledTimes(1);
        expect(letterChange).toHaveBeenCalledWith('b', 'a', jasmine.anything());
    });

    it('Unsubscribes multiple watchers from the store', () => {
        const {
            store,
            counterSelector,
            letterSelector,
            increment,
            nextLetter,
        } = setUp();

        const counterChange = jest.fn();
        const letterChange = jest.fn();

        const counterWatcher = createWatcher(counterSelector, counterChange);
        const letterWatcher = createWatcher(letterSelector, letterChange);

        const watcher = combineWatchers(counterWatcher, letterWatcher);

        const unsubscribe = watcher(store);

        unsubscribe();

        store.dispatch(increment());
        store.dispatch(nextLetter());

        expect(counterChange).not.toHaveBeenCalled();
        expect(letterChange).not.toHaveBeenCalled();
    });
});
