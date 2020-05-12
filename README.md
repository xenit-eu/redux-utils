# Redux utilities

Utilities for working with [Redux](https://redux.js.org/) (extensions on top of [Redux toolkit](https://redux-toolkit.js.org/))

## Functions

### Redux Toolkit extensions

#### `createAsyncReducer`

Creates a standard set of reducers for [RTK `createAsyncThunk`](https://redux-toolkit.js.org/api/createAsyncThunk) that only handles a single object at a time.

```typescript
const selectDocument = createAsyncThunk("selectDocument", (documentId: string) => fetch("/api/documents/"+documentId));
const selectedDocumentReducer = createAsyncReducer(
    null as IDocument | null, // Initial state
    selectDocument, // Return value of createAsyncThunk
    (state, action) => action.payload, // Reducer in case of success (defaults to replacing the state with the payload)
    (builder) => {
        // Add additional reducers here. These reducers handle the full state created by `createAsyncReducer`
    }
)
```

#### `withTypedPayload<T>()`

Creates an action payload creator with a certain type to be used with [RTK `createAction`](https://redux-toolkit.js.org/api/createAction)

```typescript

interface ISomeActionPayload {
    someValue1: string;
    someValue2: number;
}

const action = createAction("action/named", withTypedPayload<ISomeActionPayload>());

```

### Store watcher

The store watcher allows subscribing to changes in a slice of the redux state.

#### `createWatcher`

Creates a watcher for a slice of store state.

```typescript
// Create a watcher
const selectedDocumentWatcher = createWatcher(selectedDocument, (newDocument, previousDocument, { dispatch, store }) => {
    // Do something with the changed state
});

// Subscribe the watcher to the store
const unsubscribe = selectedDocumentWatcher(store);

// Unsubscribe the watcher from the store
unsubscribe();
```

#### `combineWatchers`

Combines a list of watchers into one. Similar to [`combineReducers`](https://redux.js.org/api/combinereducers/)

```typescript
// Combine a bunch of watchers into one watcher that can be subscribed to the store.
const watcher = combineWatchers(someWatcher, someOtherWatcher, aThirdWatcher);

watcher(store);
```

## Local Development

Below is a list of commands you will probably find useful.

### `npm start` or `yarn start`

Runs the project in development/watch mode. Your project will be rebuilt upon changes. TSDX has a special logger for you convenience. Error messages are pretty printed and formatted for compatibility VS Code's Problems tab.

Your library will be rebuilt if you make edits.

### `npm run build` or `yarn build`

Bundles the package to the `dist` folder.
The package is optimized and bundled with Rollup into multiple formats (CommonJS, UMD, and ES Module).

### `npm test` or `yarn test`

Runs the test watcher (Jest) in an interactive mode.
By default, runs tests related to files changed since the last commit.
