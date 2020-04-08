import {
    createReducer,
    Reducer,
    PayloadAction,
    SerializedError,
    ActionCreatorWithPreparedPayload,
    Dispatch,
    ActionReducerMapBuilder,
} from '@reduxjs/toolkit';
import {
    WithRequestIdState,
    withRequestId,
    storeRequestId,
    validateRequestIdFailure,
    validateRequestIdSuccess,
} from './requestId';

type AsyncThunkReturnPromise<Returned, ThunkArg, ThunkApiConfig> = Promise<
    | PayloadAction<
          Returned,
          string,
          { arg: ThunkArg; requestId: string },
          never
      >
    | PayloadAction<
          GetRejectValue<ThunkApiConfig> | undefined,
          string,
          { arg: ThunkArg; requestId: string; aborted: boolean },
          SerializedError
      >
> & { abort: (reason?: string | undefined) => void };

type AsyncThunkCases<Returned, ThunkArg, ThunkApiConfig> = {
    pending: ActionCreatorWithPreparedPayload<
        [string, ThunkArg],
        undefined,
        string,
        never,
        {
            arg: ThunkArg;
            requestId: string;
        }
    >;
    rejected: ActionCreatorWithPreparedPayload<
        [
            Error | null,
            string,
            ThunkArg,
            (GetRejectValue<ThunkApiConfig> | undefined)?
        ],
        GetRejectValue<ThunkApiConfig> | undefined,
        string,
        SerializedError,
        {
            arg: ThunkArg;
            requestId: string;
            aborted: boolean;
        }
    >;
    fulfilled: ActionCreatorWithPreparedPayload<
        [Returned, string, ThunkArg],
        Returned,
        string,
        never,
        {
            arg: ThunkArg;
            requestId: string;
        }
    >;
};
type GetRejectValue<ThunkApiConfig> = ThunkApiConfig extends {
    rejectValue: infer RejectValue;
}
    ? RejectValue
    : unknown;

type AsyncThunkConfig = {
    state?: unknown;
    dispatch?: Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
};

type AsyncThunkReturn<Returned, ThunkArg, ThunkApiConfig> = ((
    ...args: any[]
) => (
    ...args: any[]
) => AsyncThunkReturnPromise<Returned, ThunkArg, ThunkApiConfig>) &
    AsyncThunkCases<Returned, ThunkArg, ThunkApiConfig>;

type AllAsyncThunkActions<
    Returned,
    ThunkArg,
    ThunkApiConfig
> = AsyncThunkAction<
    Returned,
    ThunkArg,
    ThunkApiConfig,
    'pending' | 'rejected' | 'fulfilled'
>;

type AsyncThunkAction<
    Returned,
    ThunkArg,
    ThunkApiConfig,
    Pick extends 'pending' | 'rejected' | 'fulfilled'
> = ReturnType<AsyncThunkCases<Returned, ThunkArg, ThunkApiConfig>[Pick]>;

export default function createAsyncReducer<
    S,
    Returned,
    ThunkArg,
    ThunkApiConfig extends AsyncThunkConfig = {}
>(
    initialState: S | undefined,
    asyncThunkAction: AsyncThunkReturn<Returned, ThunkArg, ThunkApiConfig>,
    reducer?: Reducer<
        S | undefined,
        AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig, 'fulfilled'>
    >,
    additionalReducers?: (
        builder: ActionReducerMapBuilder<WithRequestIdState<S, ThunkApiConfig>>
    ) => void
): Reducer<
    WithRequestIdState<S, ThunkApiConfig>,
    AllAsyncThunkActions<Returned, ThunkArg, ThunkApiConfig>
>;
export default function createAsyncReducer<
    Returned,
    ThunkArg,
    ThunkApiConfig extends AsyncThunkConfig = {}
>(
    initialState:
        | AsyncThunkAction<
              Returned,
              ThunkArg,
              ThunkApiConfig,
              'fulfilled'
          >['payload']
        | undefined,
    asyncThunkAction: AsyncThunkReturn<Returned, ThunkArg, ThunkApiConfig>
): Reducer<
    WithRequestIdState<
        | AsyncThunkAction<
              Returned,
              ThunkArg,
              ThunkApiConfig,
              'fulfilled'
          >['payload']
        | undefined,
        ThunkApiConfig
    >,
    AllAsyncThunkActions<Returned, ThunkArg, ThunkApiConfig>
>;

export default function createAsyncReducer<
    Returned,
    ThunkArg,
    ThunkApiConfig extends AsyncThunkConfig = {},
    S =
        | AsyncThunkAction<
              Returned,
              ThunkArg,
              ThunkApiConfig,
              'fulfilled'
          >['payload']
        | undefined
>(
    initialState: S,
    asyncThunkAction: AsyncThunkReturn<Returned, ThunkArg, ThunkApiConfig>,
    reducer: Reducer<
        S,
        AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig, 'fulfilled'>
    > = (_state, action) => (action.payload as unknown) as S,
    additionalReducers: (
        builder: ActionReducerMapBuilder<WithRequestIdState<S, ThunkApiConfig>>
    ) => void = () => {}
): Reducer<
    WithRequestIdState<S, ThunkApiConfig>,
    AllAsyncThunkActions<Returned, ThunkArg, ThunkApiConfig>
> {
    return createReducer(
        withRequestId<S, ThunkApiConfig>(initialState),
        builder => {
            builder
                .addCase(asyncThunkAction.pending, storeRequestId())
                .addCase(asyncThunkAction.rejected, (state, action) => {
                    const x = validateRequestIdFailure()(state, action);
                    return x as any;
                })
                .addCase(
                    asyncThunkAction.fulfilled,
                    validateRequestIdSuccess(reducer)
                );
            additionalReducers(builder);
        }
    );
}
