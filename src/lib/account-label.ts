// Header and switcher wording for accounts and cottages (bugs 2 and 13, 17 Oct 2026).

export function sameName(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/** The line above the cottage name: the account, when it isn't just the cottage's name again. */
export function accountContextLine(
  account: { type: string; name: string } | null,
  propertyName: string | null | undefined,
  t: (cs: string, en: string) => string,
): string | null {
  if (!account) return null;
  if (account.type === "INSTITUTIONAL") {
    return sameName(account.name, propertyName)
      ? t("Organizace", "Organisation")
      : t(`Organizace · ${account.name}`, `Organisation · ${account.name}`);
  }
  return sameName(account.name, propertyName) ? null : account.name;
}

/** The person's photo: their own upload first, then the one Google gave at sign-up (bug 14a). */
export function avatarSource(
  profile: { avatar_url?: string | null } | null | undefined,
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): string | null {
  const meta = user?.user_metadata ?? {};
  const google = (meta["avatar_url"] ?? meta["picture"]) as string | undefined;
  return profile?.avatar_url || google || null;
}
