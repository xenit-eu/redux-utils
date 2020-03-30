import createAsyncReducer from '../createAsyncReducer';
import {
  createAsyncThunk,
  configureStore,
  SerializedError,
} from '@reduxjs/toolkit';

function setUp() {
  const asyncActions = createAsyncThunk('test', async (id: string) => {
    if (id.startsWith('fail-')) {
      throw new Error('Failed ' + id);
    }
    return { id };
  });
  const reducer = createAsyncReducer(
    null as { id: string } | null,
    asyncActions
  );

  const store = configureStore({ reducer });

  return { asyncActions, reducer, store };
}

describe('createAsyncReducer', () => {
  it('Is in the initial state', () => {
    const { store } = setUp();

    expect(store.getState()).toEqual({
      data: null,
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

  it('Can be created with a custom reducer', async () => {
    const { asyncActions } = setUp();

    const reducer = createAsyncReducer(
      null as string | null,
      asyncActions,
      (_state, action) => action.payload.id
    );

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
