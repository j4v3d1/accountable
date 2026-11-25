import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { AuthConfig, Me } from "./types";

export function useAuthConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => api<AuthConfig>("/config"), staleTime: Infinity });
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/me"), staleTime: Infinity });
}
