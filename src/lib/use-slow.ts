import { useEffect, useState } from "react";

/** True once `active` has stayed true for `ms` milliseconds; false again as soon as it ends. */
export function useSlowFlag(active: boolean, ms: number): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), ms);
    return () => window.clearTimeout(id);
  }, [active, ms]);
  return slow;
}
