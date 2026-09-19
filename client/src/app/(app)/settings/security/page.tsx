import { Screen } from "@/components/ui/screen";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { SecuritySettings } from "@/features/e2e/components/security-settings";

export default function SecurityPage() {
  return (
    <Screen>
      <SubPageHeader href="/settings" title="Security" />
      <div className="flex-1 p-4">
        <SecuritySettings />
      </div>
    </Screen>
  );
}
