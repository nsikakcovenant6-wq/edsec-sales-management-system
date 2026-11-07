/** Formats integer minor units without converting the monetary value to a JS number. */
export function formatMoney(
  minorAmount: bigint | string,
  currency: string,
  fractionDigits = 2,
  locale = "en-NG",
): string {
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 6) {
    throw new RangeError("fractionDigits must be an integer between 0 and 6");
  }

  const amount = typeof minorAmount === "bigint" ? minorAmount : BigInt(minorAmount);
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const scale = 10n ** BigInt(fractionDigits);
  const whole = absolute / scale;
  const fraction = absolute % scale;

  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const template = currencyFormatter.formatToParts(negative ? -1n : 1n);
  const wholeParts = currencyFormatter.formatToParts(whole).filter(
    (part) => part.type === "integer" || part.type === "group",
  );
  const lastNumericPart = template.reduce(
    (last, part, index) => part.type === "integer" || part.type === "group" ? index : last,
    -1,
  );

  const output: Intl.NumberFormatPart[] = [];
  template.forEach((part, index) => {
    if (part.type === "integer" || part.type === "group") {
      if (index === lastNumericPart) {
        output.push(...wholeParts);
        if (fractionDigits > 0) {
          const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
            .formatToParts(1.1)
            .find((item) => item.type === "decimal");
          if (decimal) output.push(decimal);
          output.push({ type: "fraction", value: fraction.toString().padStart(fractionDigits, "0") });
        }
      }
      return;
    }
    output.push(part);
  });

  return output.map((part) => part.value).join("");
}
