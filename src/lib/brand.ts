import { useEffect } from "react";

export function useBrand(brand: "family" | "institution") {
  useEffect(() => {
    document.documentElement.dataset["brand"] = brand;
    return () => {
      document.documentElement.dataset["brand"] = "family";
    };
  }, [brand]);
}
