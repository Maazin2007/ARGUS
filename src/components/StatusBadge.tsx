import type { Status } from "@/lib/types";
import { STATUS_TEXT } from "@/lib/indicatorMeta";

// Word, symbol and colour together, so status never depends on colour alone.
// Markup matches the mockup's `.st` element; `detail` is the small grey line under the word.
export function StatusBadge({ status, detail }: { status: Status; detail?: string }) {
  const text = STATUS_TEXT[status];
  return (
    <span className={`st st-${status}`}>
      <i aria-hidden="true">{text.symbol}</i>
      <span>
        {text.label}
        {detail ? <small>{detail}</small> : null}
      </span>
    </span>
  );
}
