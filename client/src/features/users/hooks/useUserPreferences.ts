import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/features/users/api/user-api";
import { getApiErrorMessage, type UserPreferences } from "@/types/api";

export function useUserPreferences() {
  return useQuery({
    queryKey: ["user-preferences"],
    queryFn: getUserPreferences,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) =>
      updateUserPreferences(preferences),
    onSuccess: (response) => {
      queryClient.setQueryData(["user-preferences"], response);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't update preferences"));
    },
  });
}
