import { Screen } from "@/components/ui/screen";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { EditProfileForm } from "./_components/edit-profile-form";

export default function EditProfilePage() {
  return (
    <Screen>
      <SubPageHeader href="/settings" title="Edit profile" />
      <EditProfileForm />
    </Screen>
  );
}
