"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { getApiErrorMessage, type ApiResponse } from "@/types/api";
import { type User } from "@/types/api";
import {
  completeProfileSchema,
  type CompleteProfileValues,
} from "../schemas/complete-profile-schema";
import { useCompleteProfile } from "../hooks/use-complete-profile";

type CompleteProfileFormProps = {
  onSuccess: (result: ApiResponse<{ user: User }>) => void;
};

export function CompleteProfileForm({ onSuccess }: CompleteProfileFormProps) {
  const { mutate, isPending, isError, error } = useCompleteProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (values: CompleteProfileValues) => {
    mutate(values, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <FormField
        label="Name"
        name="name"
        type="text"
        placeholder="Your name"
        autoComplete="name"
        registration={register("name")}
        error={errors.name}
      />

      {isError && (
        <p role="alert" className="text-destructive text-sm">
          {getApiErrorMessage(error)}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : "Start chatting"}
      </Button>
    </form>
  );
}
