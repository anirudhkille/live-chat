import { Screen } from "@/components/ui/screen";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { AppearanceForm } from "./_components/appearance-form";

export default function AppearancePage() {
  return (
    <Screen>
      <SubPageHeader href="/settings" title="Appearance" />
      <div className="flex-1 p-4">
        <AppearanceForm />
      </div>
    </Screen>
  );
}
