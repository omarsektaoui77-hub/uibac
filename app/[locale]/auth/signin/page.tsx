"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

export default function SignInPage() {
  const t = useTranslations("Auth.signup");
  const locale = useLocale();

  return (
    <div>
      <h1>{t("title")}</h1>

      <Link href={`/${locale}/auth/signup`}>
        Go to signup
      </Link>
    </div>
  );
}
