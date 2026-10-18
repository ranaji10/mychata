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

/** "1 chata", "3 chaty", "5 chat" / "1 cottage", "3 cottages" (switcher headings, T-041). */
export function cottageCount(n: number, t: (cs: string, en: string) => string): string {
  const cs = n === 1 ? "chata" : n >= 2 && n <= 4 ? "chaty" : "chat";
  return t(`${n} ${cs}`, `${n} ${n === 1 ? "cottage" : "cottages"}`);
}

/** A starting account name from the email: "jan.novak@seznam.cz" → "jan.novak" (T-042). */
export function accountNameFromEmail(email: string | null | undefined): string {
  return (email ?? "").split("@")[0]?.trim() ?? "";
}

/**
 * Family accounts the person runs whose name is the same as one of their cottages (T-042):
 * My profile asks the admin to rename them, so "Chata Alfa" over Alfa, Beta and Gama stops
 * reading as Beta inside Alfa.
 */
export function familyAccountsNamedLikeCottage(
  accounts: { id: string; type: string; name: string }[],
  adminAccountIds: string[],
  cottagesByAccount: Record<string, { name: string }[]>,
): { id: string; name: string }[] {
  return accounts.filter(
    (a) =>
      a.type === "FAMILY" &&
      adminAccountIds.includes(a.id) &&
      (cottagesByAccount[a.id] ?? []).some((c) => sameName(c.name, a.name)),
  );
}
