/**
 * Serializes BigInt values to strings in JSON
 * Used for Prisma models that contain BigInt fields
 */
export function serializeBigInt(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as unknown;
}
