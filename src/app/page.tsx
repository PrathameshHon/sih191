import { AppShell } from "@/components/resqx/shell";
import { ResQXProvider } from "@/components/resqx/store";
import { I18nProvider } from "@/lib/i18n";

export default function Page() {
  return (
    <I18nProvider>
      <ResQXProvider>
        <AppShell />
      </ResQXProvider>
    </I18nProvider>
  );
}
