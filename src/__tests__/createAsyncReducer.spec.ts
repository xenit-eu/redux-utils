import createAsyncReducer from '../createAsyncReducer';
import {
    createAsyncThunk,
    configureStore,
    SerializedError,
} from '@reduxjs/toolkit';

function setUp() {
    const asyncActions = createAsyncThunk<
        { id: string },
        string,
        { rejectValue: { error: string } }
    >('test', async (id, { rejectWithValue }) => {
        if (id.startsWith('fail-')) {
            throw new Error('Failed ' + id);
        } else if (id.startsWith('reject-')) {
            return rejectWithValue({ error: 'rejected: ' + id });
        }
        return { id };
    });
    const reducer = createAsyncReducer<
        { id: string },
        string,
        { rejectValue: { error: string } }
    >(undefined, asyncActions);

    const store = configureStore({ reducer });

    return { asyncActions, reducer, store };
}

describe('createAsyncReducer', () => {
    it('Is in the initial state', () => {
        const { store } = setUp();

        expect(store.getState()).toEqual({
            data: undefined,
            isLoading: false,
            requestError: null,
            requestId: null,
        });
    });

    it('Transitions to loading state when an action is dispatched', async () => {
        const { store, asyncActions } = setUp();

        const dispatchPromise = store.dispatch(asyncActions('some-id'));

        const { requestId, ...state } = store.getState();

        expect(state).toEqual({
            data: undefined,
            isLoading: true,
            requestError: null,
        });

        await dispatchPromise.then(result =>
            expect(result.meta.requestId).toEqual(requestId)
        );

        expect(store.getState()).toEqual({
            data: { id: 'some-id' },
            isLoading: false,
            requestError: null,
            requestId: null,
        });
    });

    it('Transitions to error state when an action fails', async () => {
        const { store, asyncActions } = setUp();

        const dispatchPromise = store.dispatch(asyncActions('fail-some-id'));

        const { requestId, ...state } = store.getState();

        expect(state).toEqual({
            data: undefined,
            isLoading: true,
            requestError: null,
        });

        await dispatchPromise.then(result =>
            expect(result.meta.requestId).toEqual(requestId)
        );

        const { requestError, ...newState } = store.getState();

        expect(newState).toEqual({
            data: undefined,
            isLoading: false,
            requestId: null,
        });

        expect((requestError as SerializedError).message).toEqual(
            'Failed fail-some-id'
        );
    });

    it('Transitions to error state when an action is rejected', async () => {
        const { store, asyncActions } = setUp();

        const dispatchPromise = store.dispatch(asyncActions('reject-some-id'));

        const { requestId, ...state } = store.getState();

        expect(state).toEqual({
            data: undefined,
            isLoading: true,
            requestError: null,
        });

        await dispatchPromise.then(result =>
            expect(result.meta.requestId).toEqual(requestId)
        );

        const { requestError, ...newState } = store.getState();

        expect(newState).toEqual({
            data: undefined,
            isLoading: false,
            requestId: null,
        });

        expect(requestError as { error: string }).toEqual({
            error: 'rejected: reject-some-id',
        });
    });

    it('Can be created with a custom reducer', async () => {
        const { asyncActions } = setUp();

        const reducer = createAsyncReducer<
            string,
            { id: string },
            string,
            { rejectValue: { error: string } }
        >(undefined, asyncActions, (_state, action) => action.payload.id);

        const store = configureStore({ reducer });

        const dispatchPromise = store.dispatch(asyncActions('some-id'));

        const { requestId, ...state } = store.getState();

        expect(state).toEqual({
            data: undefined,
            isLoading: true,
            requestError: null,
        });

        await dispatchPromise.then(result =>
            expect(result.meta.requestId).toEqual(requestId)
        );

        expect(store.getState()).toEqual({
            data: 'some-id',
            isLoading: false,
            requestError: null,
            requestId: null,
        });
    });
});
