import { Observable } from 'rxjs'

import {
    graphQLClient,
    GraphQLResult,
    requestGraphQLCommon,
    watchQueryCommon,
} from '@sourcegraph/shared/src/graphql/graphql'
import * as GQL from '@sourcegraph/shared/src/graphql/schema'

const getHeaders = (): { [header: string]: string } => ({
    ...window?.context?.xhrHeaders,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Sourcegraph-Should-Trace': new URLSearchParams(window.location.search).get('trace') || 'false',
})

/**
 * Does a GraphQL request to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param request The GraphQL request (query or mutation)
 * @param variables A key/value object with variable values
 * @returns Observable That emits the result or errors if the HTTP request failed
 * @template TResult The type of the query result (import from our auto-generated types).
 * @template TVariables The type of the query input variables (import from our auto-generated types).
 */
export const requestGraphQL = <TResult, TVariables = object>(
    request: string,
    variables?: TVariables
): Observable<GraphQLResult<TResult>> =>
    requestGraphQLCommon({
        request,
        variables,
        headers: getHeaders(),
    })

/**
 * Similar to `requestGraphQL`, this function will make a GraphQL request to `/.api/graphql` and route through the Apollo cache.
 * Ideally we should just Apollo `useQuery` or `useMutation` methods, but this function acts as a bridge between RxJS observables and Apollo.
 * It means we can realise the benefits of the Apollo cache without having a dependency on refactoring problematic components such as `FilteredConnection`.
 *
 * @param request The GraphQL query
 * @param variables A key/value object with variable values
 * @returns Observable That emits the result or errors if the HTTP request failed
 * @template TResult The type of the query result (import from our auto-generated types).
 * @template TVariables The type of the query input variables (import from our auto-generated types).
 */
export const watchQuery = <TResult, TVariables = object>(
    request: string,
    variables?: TVariables
): Observable<GraphQLResult<TResult>> =>
    watchQueryCommon({
        request,
        variables,
        client,
    })

/**
 * Does a GraphQL query to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param request The GraphQL query
 * @param variables A key/value object with variable values
 * @returns Observable That emits the result or errors if the HTTP request failed
 *
 * @deprecated Prefer using `requestGraphQL()` and passing auto-generated query types as type parameters.
 */
export const queryGraphQL = (request: string, variables?: {}): Observable<GraphQLResult<GQL.IQuery>> =>
    requestGraphQLCommon<GQL.IQuery>({
        request,
        variables,
        headers: getHeaders(),
    })

/**
 * Does a GraphQL mutation to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param request The GraphQL mutation
 * @param variables A key/value object with variable values
 * @returns Observable That emits the result or errors if the HTTP request failed
 *
 * @deprecated Prefer using `requestGraphQL()` and passing auto-generated query types as type parameters.
 */
export const mutateGraphQL = (request: string, variables?: {}): Observable<GraphQLResult<GQL.IMutation>> =>
    requestGraphQLCommon<GQL.IMutation>({
        request,
        variables,
        headers: getHeaders(),
    })

export const client = graphQLClient({ headers: getHeaders() })
