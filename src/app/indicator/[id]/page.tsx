import { Suspense } from "react";
import { IndicatorRoute } from "@/components/screens/IndicatorScreen";
import { INDICATOR_ORDER } from "@/lib/indicatorMeta";

// The six indicator pages are listed up front, so Next.js can build them ahead of time.
// Next.js 16 needs this: without it, the header's usePathname() blocks the build.
export function generateStaticParams() {
  return INDICATOR_ORDER.map((id) => ({ id }));
}

// The id comes from the URL, so it is read inside <Suspense>: Next.js 16 then keeps
// the shared page frame instant and fills in the screen once the URL is known.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <IndicatorRoute />
    </Suspense>
  );
}
