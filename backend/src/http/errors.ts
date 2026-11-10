export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SUBSCRIPTION_INACTIVE"
  | "PLAN_FEATURE_UNAVAILABLE"
  | "PLAN_LIMIT_EXCEEDED"
  | "PAYMENT_REQUIRED"
  | "STOCK_INSUFFICIENT"
  | "PRICE_CHANGED"
  | "PRODUCT_ARCHIVED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "EMAIL_NOT_VERIFIED"
  | "PAYMENT_UNVERIFIED"
  | "TENANT_CONTEXT_REQUIRED"
  | "SYNC_BATCH_TOO_LARGE"
  | "DISCOUNT_BELOW_COST"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toBody(requestId: string) {
    return {
      error: {
        code: this.code,
        message: this.message,
        request_id: requestId,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    };
  }
}
