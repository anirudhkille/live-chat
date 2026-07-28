import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form"
import { completeProfileSchema } from "../schemas/complete-profile-schema"
import { useCompleteProfile } from "../hooks/use-complete-profile"

export function CompleteProfileForm({ onSuccess }) {
  const { mutate, isPending, error } = useCompleteProfile()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(completeProfileSchema),
  })

  const onSubmit = (data) => {
    mutate(data, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Name"
        name="name"
        register={register}
        error={errors.name}
        type="text"
        placeholder="Your name"
      />

      {error && (
        <p className="text-sm text-destructive">
          {error.response?.data?.message || "Something went wrong"}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : "Start chatting"}
      </Button>
    </form>
  )
}
