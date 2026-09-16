"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateGroup,
  deleteGroup,
  removeGroupParticipant,
  getGroupPhotoUploadUrl,
} from "../api/conversation-api";
import { putPresignedObject } from "@/lib/api";
import { getApiErrorMessage } from "@/types/api";

export function useUpdateGroup(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name?: string; photoUrl?: string }) =>
      updateGroup(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["conversation-with-messages", conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["group-participants", conversationId],
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't update group"));
    },
  });
}

export function useDeleteGroup(conversationId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => deleteGroup(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Group deleted");
      router.replace("/chats");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't delete group"));
    },
  });
}

export function useRemoveGroupParticipant(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      removeGroupParticipant(conversationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["group-participants", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Member removed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't remove member"));
    },
  });
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function useUploadGroupPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Please choose a JPG, PNG, or WebP image.");
      }
      if (file.size > MAX_SIZE) {
        throw new Error("Image must be 5MB or smaller.");
      }
      const { data: urlData } = await getGroupPhotoUploadUrl(file.type);
      await putPresignedObject(urlData.uploadUrl, file, file.type);
      return urlData.key;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Photo upload failed"
      );
    },
  });
}
