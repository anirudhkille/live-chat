"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useGroupParticipants } from "../hooks/useGroupParticipants";
import { useAddGroupParticipants } from "../hooks/useAddGroupParticipants";
import { useSearchUsers } from "@/features/users/hooks/useSearch";
import { useAuthStore } from "@/store/auth-store";

export function GroupMembersDialog({
  open,
  onClose,
  conversationId,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: members, isLoading } = useGroupParticipants(conversationId);
  const addMembers = useAddGroupParticipants(conversationId);
  const [query, setQuery] = useState("");
  const { data: results, isLoading: searching } = useSearchUsers(query, 1, 8);

  const memberIds = new Set((members ?? []).map((member) => member.id));
  const addableUsers = (results ?? []).filter(
    (user) => user.id !== currentUserId && !memberIds.has(user.id)
  );

  const handleAdd = (userId: string) => {
    addMembers.mutate([userId], {
      onSuccess: () => toast.success("Member added"),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Group info"
      description={`${members?.length ?? 0} ${(members?.length ?? 0) === 1 ? "member" : "members"}`}
    >
      <p className="mb-2 text-sm font-medium">Add members</p>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or email"
        aria-label="Search users to add"
      />
      <div className="mt-2 mb-4 max-h-32 overflow-y-auto">
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
                  <p className="truncate font-medium">
                    {user.name ?? "Unnamed"}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                </div>
                <Plus className="h-4 w-4 shrink-0" />
              </button>
            ))
          )
        ) : (
          <p className="text-muted-foreground text-xs">
            Search to find people to add.
          </p>
        )}
      </div>

      <p className="mb-2 text-sm font-medium">Members</p>
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : (
          (members ?? []).map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <Avatar
                name={member.name}
                email={member.email}
                src={member.avatar}
                size="xs"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.name ?? "Unnamed"}
                  {member.id === currentUserId ? " (you)" : ""}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {member.email}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}