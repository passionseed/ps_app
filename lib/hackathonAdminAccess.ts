const HACKATHON_ADMIN_EMAILS = new Set(["bysfang@gmail.com"]);

export function isHackathonAdminEmail(email: string | null | undefined) {
  return HACKATHON_ADMIN_EMAILS.has(email?.trim().toLowerCase() ?? "");
}
