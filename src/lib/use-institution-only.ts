import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAccount } from "@/lib/account";

/**
 * Pages that only make sense for institutions (stay requests, usage export, approvals).
 * A family account that opens one by its address goes Home instead of seeing an empty
 * institution screen. Returns true while the page should render nothing.
 */
export function useInstitutionOnly(): boolean {
  const { account } = useAccount();
  const navigate = useNavigate();
  const isFamily = account?.type === "FAMILY";
  useEffect(() => {
    if (isFamily) void navigate({ to: "/domu", replace: true });
  }, [isFamily, navigate]);
  return isFamily;
}
