/** The slice of a Realtime Database reference that `updateExistingItem` needs. */
export interface ItemRefLike {
  transaction(
    update: (current: any) => any,
  ): Promise<{ committed: boolean; snapshot: { exists(): boolean } }>;
}

/**
 * Merges `fields` into the record at `ref`, only if the record exists. Returns false when it does
 * not. Done in one transaction so that an item deleted after the permission check cannot be
 * re-created by the update.
 *
 * A transaction's first run may see `null` even for a record that exists (the local guess); the
 * server then rejects the write and runs it again with the real value. Returning `null` for `null`
 * writes nothing when the record really is missing, and is rejected and retried when it is not.
 */
export async function updateExistingItem(
  ref: ItemRefLike,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const result = await ref.transaction((current) =>
    current === null || current === undefined
      ? null
      : { ...current, ...fields },
  );

  return result.snapshot.exists();
}
