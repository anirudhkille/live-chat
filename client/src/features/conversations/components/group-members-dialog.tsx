"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, Trash2, Camera, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGroupParticipants } from "../hooks/useGroupParticipants";
import { useAddGroupParticipants } from "../hooks/useAddGroupParticipants";
import { useSearchUsers } from "@/features/users/hooks/useSearch";
import { useAuthStore } from "@/store/auth-store";
import {
  useUpdateGroup,
  useDeleteGroup,
  useRemoveGroupParticipant,
  useUploadGroupPhoto,
} from "../hooks/useGroupAdmin";
import type { Conversation, GroupParticipant } from "@/types/api";

export function GroupMembersDialog({
  open,
  onClose,
  conversation,
}: {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: members, isLoading } = useGroupParticipants(conversation.id);
  const addMembers = useAddGroupParticipants(conversation.id);
  const updateGroup = useUpdateGroup(conversation.id);
  const deleteGroup = useDeleteGroup(conversation.id);
  const removeMember = useRemoveGroupParticipant(conversation.id);
  const uploadPhoto = useUploadGroupPhoto();

  const [query, setQuery] = useState("");
  const { data: results, isLoading: searching } = useSearchUsers(query, 1, 8);

  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversation.name ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = conversation.currentUserRole === "admin";

  const memberIds = new Set((members ?? []).map((member) => member.id));
  const addableUsers = (results ?? []).filter(
    (user) => user.id !== currentUserId && !memberIds.has(user.id)
  );

  const handleAdd = (userId: string) => {
    addMembers.mutate([userId], {
      onSuccess: () => toast.success("Member added"),
    });
  };

  const handleSaveName = () => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    updateGroup.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          toast.success("Group name updated");
          setEditingName(false);
        },
      }
    );
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    uploadPhoto.mutate(file, {
      onSuccess: (key) => {
        updateGroup.mutate({ photoKey: key });
      },
    });
  };

  const handleRemove = (userId: string) => {
    removeMember.mutate(userId);
  };

  const handleDelete = () => {
    deleteGroup.mutate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Group info"
      description={`${members?.length ?? 0} ${
        (members?.length ?? 0) === 1 ? "member" : "members"
      }`}
    >
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative">
          <Avatar
            name={conversation.name ?? undefined}
            src={conversation.photoUrl}
            size="lg"
            variant="primary"
          />
          {isAdmin && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadPhoto.isPending}
              aria-label="Change group photo"
              className="bg-card absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border"
            >
              {uploadPhoto.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="text-muted-foreground h-3.5 w-3.5" />
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {editingName ? (
          <div className="flex w-full items-center gap-2">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
              disabled={updateGroup.isPending}
            />
            <Button
              size="sm"
              onClick={handleSaveName}
              disabled={updateGroup.isPending}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingName(false);
                setGroupName(conversation.name ?? "");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-foreground">
              {conversation.name}
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                aria-label="Edit group name"
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="mt-4 grid gap-2">
          <p className="mb-1 text-sm font-medium text-foreground">Add members</p>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search users to add"
          />
          <div className="max-h-32 overflow-y-auto">
            {query.trim().length >= 2 ? (
              searching ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                </div>
              ) : addableUsers.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Everyone is already a member.
                </p>
              ) : (
                addableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAdd(user.id)}
                    disabled={addMembers.isPending}
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors disabled:opacity-50"
                  >
                    <Avatar
                      name={user.name}
                      email={user.email}
                      src={user.avatar}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {user.name ?? "Unnamed"}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                ))
              )
            ) : (
              <p className="text-muted-foreground text-xs">
                Search to find people to add.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mb-2 mt-4 text-sm font-medium text-foreground">Members</p>
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : (
          (members ?? []).map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRemove={handleRemove}
              removing={removeMember.isPending}
            />
          ))
        )}
      </div>

      {isAdmin && (
        <div className="mt-4 border-t pt-4">
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete group
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-destructive text-xs">
                This cannot be undone. All messages will be lost.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={deleteGroup.isPending}
                >
                  {deleteGroup.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function MemberRow({
  member,
  currentUserId,
  isAdmin,
  onRemove,
  removing,
}: {
  member: GroupParticipant;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const isMe = member.id === currentUserId;
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
      <Avatar
        name={member.name}
        email={member.email}
        src={member.avatar}
        size="xs"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.name ?? "Unnamed"}
          {isMe ? " (you)" : ""}
          {member.role === "admin" && (
            <span className="text-muted-foreground ml-1 text-xs">admin</span>
          )}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {member.email}
        </p>
      </div>
      {isAdmin && !isMe && (
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          disabled={removing}
          aria-label={`Remove ${member.name ?? member.email}`}
          className="text-muted-foreground hover:text-destructive rounded-md p-1 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
