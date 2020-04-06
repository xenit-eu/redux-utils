export default function withTypedPayload<T>() {
    return (payload: T) => ({ payload });
}
