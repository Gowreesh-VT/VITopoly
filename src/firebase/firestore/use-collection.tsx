'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    };
  };
}

/**
 * Extracts the Firestore path string from a CollectionReference or Query.
 */
function extractPath(
  refOrQuery: CollectionReference<DocumentData> | Query<DocumentData>,
): string {
  if (refOrQuery.type === 'collection') {
    return (refOrQuery as CollectionReference).path;
  }
  return (refOrQuery as unknown as InternalQuery)._query.path.canonicalString();
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN.
 * Use useMemo to memoize it per React guidance. Also make sure that its dependencies are stable
 * references.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param memoizedTargetRefOrQuery The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery:
    | ((CollectionReference<DocumentData> | Query<DocumentData>) & {
        __memo?: boolean;
      })
    | null
    | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Guard 1: No ref/query provided — reset and wait.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Guard 2: Reject queries that resolve to the database root.
    // This happens when a path segment (e.g. eventId) is undefined, causing
    // the constructed reference to collapse to "/".
    const path = extractPath(memoizedTargetRefOrQuery);
    if (!path || path === '/' || path === '') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[useCollection] Called with a root-level path ("' +
            path +
            '"). This usually means a path segment was undefined when building ' +
            'the collection reference. Skipping subscription.',
        );
      }
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // Log the REAL error before wrapping it
        console.error(`[useCollection] Firestore error on path "${path}":`, err.code, err.message);

        if (err.code === 'permission-denied') {
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          });

          setError(contextualError);
          setData(null);
          setIsLoading(false);

          // Trigger global error propagation
          errorEmitter.emit('permission-error', contextualError);
        } else {
          // For non-permission errors (missing index, network, etc.),
          // don't wrap as permission error
          setError(err);
          setData(null);
          setIsLoading(false);
          console.error(`[useCollection] Non-permission error:`, err);
        }
      },
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(
      memoizedTargetRefOrQuery +
        ' was not properly memoized using useMemoFirebase',
    );
  }

  return { data, isLoading, error };
}