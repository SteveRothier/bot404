"use server";

import {
  AUTH_MESSAGES,
  EMAIL_PATTERN,
  passwordResetCooldownMessage,
  RESET_PASSWORD_PATH,
  validatePassword,
} from "@/lib/auth/constants";
import {
  checkPasswordResetCooldown,
  PASSWORD_RESET_COOLDOWN_MINUTES,
  setPasswordResetCooldown,
} from "@/lib/auth/password-reset-cooldown";
import { getSiteOrigin } from "@/lib/auth/site-url";
import { requireAuthUser } from "@/lib/queries/shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PasswordResetFailure = {
  ok: false;
  reason: "invalid" | "not_found" | "rate_limited" | "error";
  message: string;
  field?: "email";
};

export type PasswordResetResult = { ok: true } | PasswordResetFailure;

function isRateLimitError(error: { code?: string; message?: string }): boolean {
  if (error.code === "over_request_rate_limit") return true;
  const lower = (error.message ?? "").toLowerCase();
  return (
    lower.includes("security purposes") ||
    lower.includes("only request this after") ||
    lower.includes("rate limit")
  );
}

export async function requestPasswordReset(
  email: string,
  origin: string
): Promise<PasswordResetResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    return {
      ok: false,
      reason: "invalid",
      message: AUTH_MESSAGES.emailInvalid,
      field: "email",
    };
  }

  const cooldown = await checkPasswordResetCooldown(normalized);
  if (!cooldown.ok) {
    return {
      ok: false,
      reason: "rate_limited",
      message: passwordResetCooldownMessage(PASSWORD_RESET_COOLDOWN_MINUTES),
      field: "email",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      reason: "error",
      message: AUTH_MESSAGES.serverConfigUnavailable,
    };
  }

  const { data: exists, error: existsError } = await admin.rpc(
    "auth_email_exists",
    { target_email: normalized }
  );

  if (existsError) {
    return {
      ok: false,
      reason: "error",
      message: AUTH_MESSAGES.resetVerifyFailed,
    };
  }

  if (!exists) {
    return {
      ok: false,
      reason: "not_found",
      message: AUTH_MESSAGES.emailNotFound,
      field: "email",
    };
  }

  const siteOrigin = getSiteOrigin(origin);
  const redirectTo = `${siteOrigin}${RESET_PASSWORD_PATH}`;

  const { error: sendError } = await admin.auth.resetPasswordForEmail(
    normalized,
    { redirectTo }
  );

  if (sendError) {
    if (isRateLimitError(sendError)) {
      return {
        ok: false,
        reason: "error",
        message: AUTH_MESSAGES.resetRateLimited,
      };
    }
    return {
      ok: false,
      reason: "error",
      message: AUTH_MESSAGES.resetEmailFailed,
    };
  }

  await setPasswordResetCooldown(normalized);
  return { ok: true };
}

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      field?: "current" | "new" | "confirm";
    };

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  if (!currentPassword) {
    return {
      ok: false,
      message: AUTH_MESSAGES.currentPasswordRequired,
      field: "current",
    };
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return { ok: false, message: passwordError, field: "new" };
  }

  const auth = await requireAuthUser(
    "Connectez-vous pour modifier votre mot de passe."
  );
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const email = auth.user.email;
  if (!email) {
    return { ok: false, message: AUTH_MESSAGES.genericError };
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    return {
      ok: false,
      message: AUTH_MESSAGES.currentPasswordInvalid,
      field: "current",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return {
      ok: false,
      message:
        updateError.code === "same_password"
          ? AUTH_MESSAGES.samePassword
          : AUTH_MESSAGES.genericError,
      field: "new",
    };
  }

  return { ok: true };
}
