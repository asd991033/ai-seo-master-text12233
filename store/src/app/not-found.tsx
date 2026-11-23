import Link from "@/components/Link";
import { t } from "@/i18n";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-3 text-mute">{t.common.notFound}</p>
      <Link href="/" className="btn-primary mt-6">{t.common.backHome}</Link>
    </div>
  );
}
