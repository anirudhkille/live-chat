import { Phone } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function CallsPage() {
  return (
    <div className="bg-background flex h-full flex-col items-center justify-center p-6">
      <EmptyState
        icon={Phone}
        title="Calls"
        description="Select a call to open the conversation, or use the call button to call back."
      />
    </div>
  );
}
