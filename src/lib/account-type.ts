// Account type changes (T-045, D-03): the owner may switch family <-> organisation once in six
// months. The database decides (change_account_type(), migration 0036); these helpers only
// word the answer for the screen.

/** The date from which the type may change again, or null when it may change now. */
export function nextTypeChange(
  typeChangedAt: string | null,
  now: Date = new Date(),
): string | null {
  if (!typeChangedAt) return null;
  const next = new Date(typeChangedAt);
  if (Number.isNaN(next.getTime())) return null;
  // Same as Postgres "+ interval '6 months'": same day of the month, clamped to the month's end.
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 6);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next.getTime() > now.getTime() ? next.toISOString() : null;
}

type T = (cs: string, en: string) => string;

/** A plain sentence for an error from change_account_type / convert_account_to_institution. */
export function accountTypeChangeError(message: string, t: T): string {
  const cooldown = /type_change_cooldown:(\d{4})-(\d{2})-(\d{2})/.exec(message);
  if (cooldown) {
    const [, y, m, d] = cooldown;
    return t(
      `Typ účtu lze měnit jednou za 6 měsíců. Znovu to půjde od ${d}.${m}.${y}.`,
      `The account type can change once in 6 months. You can change it again from ${d}.${m}.${y}.`,
    );
  }
  if (message.includes("owner_required") || message.includes("Admin role required"))
    return t(
      "Typ účtu může změnit jen jeho vlastník (ten, kdo účet založil, nebo komu ho předal).",
      "Only the account's owner (who set it up, or whom they handed it to) can change its type.",
    );
  if (message.includes("billing_change_required"))
    return t(
      "Účet má placený tarif. Typ účtu se pak mění přes předplatné; napište nám.",
      "This account has a paid plan, so the type is changed through the subscription; please contact us.",
    );
  if (message.includes("institution_email_required"))
    return t(
      "Organizaci může založit jen přihlášení pracovním e-mailem.",
      "Only a work-email sign-in can set up an organisation.",
    );
  if (message.includes("account_name_same_as_cottage"))
    return t(
      "Rodinný účet se nesmí jmenovat stejně jako chata. Zvolte jiný název, např. příjmení.",
      "A family account can't have a cottage's name. Choose another, e.g. the family name.",
    );
  if (message.includes("bad_name"))
    return t("Zadejte název (2 až 120 znaků).", "Enter a name (2 to 120 characters).");
  if (message.includes("same_type"))
    return t("Účet už tento typ má.", "The account already has this type.");
  return t(`Změna se nepodařila: ${message}`, `Could not change it: ${message}`);
}
