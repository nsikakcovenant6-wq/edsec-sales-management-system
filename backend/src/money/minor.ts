const UNSIGNED_MINOR = /^[0-9]+$/;
const SIGNED_MINOR = /^-?[0-9]+$/;

export function parseMoneyMinor(value: string): bigint {
  if (!UNSIGNED_MINOR.test(value)) throw new TypeError("MoneyMinor must be an unsigned base-10 integer string");
  return BigInt(value);
}

export function parseSignedMoneyMinor(value: string): bigint {
  if (!SIGNED_MINOR.test(value)) throw new TypeError("SignedMoneyMinor must be a signed base-10 integer string");
  return BigInt(value);
}

export function parseQuantity(value: string): string {
  if (!/^[0-9]+(\.[0-9]{1,4})?$/.test(value)) {
    throw new TypeError("Quantity must be non-negative with at most four decimal places");
  }
  return value;
}

export function parseSignedQuantity(value: string): string {
  if (!/^-?[0-9]+(\.[0-9]{1,4})?$/.test(value)) {
    throw new TypeError("SignedQuantity must have at most four decimal places");
  }
  return value;
}
