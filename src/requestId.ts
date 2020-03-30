import {
    SerializedError,
    Reducer,
    PayloadAction,
    Draft,
    Dispatch,
} from '@reduxjs/toolkit';
import invariant from 'tiny-invariant';

export type WithRequestIdState<S, ThunkApiConfig> =
    | WithRequestIdStateLoading
    | WithRequestIdStateSuccess<S>
    | WithRequestIdStateFailure<ThunkApiConfig>;

type DraftReducer<S, A> = (state: S | Draft<S>, action: A) => S | void;

interface WithRequestIdStateLoading {
    data: undefined;
    isLoading: true;
    requestId: string;
    requestError: null;
}

interface WithRequestIdStateSuccess<S> {
    data: S;
    isLoading: false;
    requestId: null;
    requestError: null;
}

interface WithRequestIdStateFailure<ThunkApiConfig extends AsyncThunkConfig> {
    data: undefined;
    isLoading: false;
    requestId: null;
    requestError: GetRejectValue<ThunkApiConfig> | SerializedError;
}

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

export function withRequestId<S, ThunkApiConfig extends AsyncThunkConfig = {}>(
    initialState: S
): WithRequestIdState<S, ThunkApiConfig> {
    return {
        data: initialState,
        isLoading: false,
        requestId: null,
        requestError: null,
    };
}

export function storeRequestId<
    S,
    Payload = void,
    ThunkArg = unknown,
    A extends PayloadAction<
        Payload,
        string,
        { arg: ThunkArg; requestId: string }
    > = PayloadAction<Payload, string, { arg: ThunkArg; requestId: string }>,
    E = SerializedError
>(): DraftReducer<WithRequestIdState<S, E>, A> {
    return (_state, action) => {
        return {
            isLoading: true,
            data: undefined,
            requestError: null,
            requestId: action.meta.requestId,
        };
    };
}

export function validateRequestIdSuccess<
    S,
    Payload,
    ThunkArg = unknown,
    Error = SerializedError,
    A extends PayloadAction<
        Payload,
        string,
        { arg: ThunkArg; requestId: string }
    > = PayloadAction<Payload, string, { arg: ThunkArg; requestId: string }>
>(reducer: Reducer<S, A>): DraftReducer<WithRequestIdState<S, Error>, A> {
    return (state, action) => {
        if (state?.requestId === action.meta.requestId) {
            return {
                isLoading: false,
                data: reducer(state?.data, action),
                requestId: null,
                requestError: null,
            };
        }
        invariant(state !== undefined, 'state can not be undefined');
        return state as any;
    };
}

export function validateRequestIdFailure<
    S,
    ThunkArg,
    ThunkApiConfig extends AsyncThunkConfig = {},
    Error extends SerializedError | GetRejectValue<ThunkApiConfig> =
        | SerializedError
        | GetRejectValue<ThunkApiConfig>,
    A extends PayloadAction<
        Error | undefined,
        string,
        { arg: ThunkArg; requestId: string; aborted: boolean },
        SerializedError
    > = PayloadAction<
        Error | undefined,
        string,
        { arg: ThunkArg; requestId: string; aborted: boolean },
        SerializedError
    >
>(): DraftReducer<WithRequestIdState<S, Error>, A> {
    return (state, action) => {
        if (state?.requestId === action.meta.requestId) {
            return {
                isLoading: false,
                data: undefined,
                requestId: null,
                requestError: action.payload || action.error,
            };
        }
        invariant(state !== undefined, 'state can not be undefined');
        return state as any;
    };
}
