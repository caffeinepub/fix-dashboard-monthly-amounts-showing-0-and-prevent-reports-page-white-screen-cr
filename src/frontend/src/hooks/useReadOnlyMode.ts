import { useGetReadOnlyMode } from "./useQueries";

/**
 * Hook to check if the application is in read-only mode.
 * Read-only mode allows draft environment to access production data without modification capabilities.
 */
export function useReadOnlyMode() {
  const { data: hasReadOnlyAccess, isLoading } = useGetReadOnlyMode();

  return {
    isReadOnly: hasReadOnlyAccess ?? false,
    isLoading,
  };
}
