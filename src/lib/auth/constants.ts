export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;
export const RESET_PASSWORD_PATH = "/login/reset-password";

export const AUTH_MESSAGES = {
  emailRequired: "Saisissez votre adresse e-mail.",
  emailInvalid: "Adresse e-mail invalide.",
  emailNotFound: "Adresse e-mail inexistante.",
  passwordMinLength: "Le mot de passe doit contenir au moins 6 caractères.",
  passwordMismatch: "Les mots de passe ne correspondent pas.",
  loginInvalid: "Email ou mot de passe incorrect.",
  emailNotConfirmed:
    "Confirmez votre adresse e-mail avant de vous connecter (vérifiez vos spams).",
  userExists: "Un compte existe déjà avec cette adresse e-mail.",
  genericError: "Une erreur est survenue. Réessayez.",
  callbackAuthError: "Lien de connexion invalide ou expiré.",
  recoveryExpired: "Lien expiré ou déjà utilisé. Demandez un nouveau lien.",
  recoveryInvalid: "Lien invalide ou expiré. Demandez un nouveau lien.",
  sessionInvalid:
    "Session invalide. Utilisez le lien reçu par email ou demandez-en un nouveau.",
  samePassword: "Le nouveau mot de passe doit être différent de l'ancien.",
  resetEmailFailed: "Impossible d'envoyer l'email. Réessayez.",
  resetRateLimited: "Trop de demandes. Réessayez dans quelques instants.",
  resetVerifyFailed: "Impossible de vérifier l'adresse e-mail.",
  serverConfigUnavailable: "Configuration serveur indisponible.",
  signupConfirmationSent:
    "Compte créé. Un email de confirmation a été envoyé (vérifiez les spams).",
  signupSuccess: "Compte créé. Vous pouvez vous connecter.",
  passwordUpdated:
    "Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe…",
  currentPasswordRequired: "Saisissez votre mot de passe actuel.",
  currentPasswordInvalid: "Mot de passe actuel incorrect.",
  passwordChanged: "Mot de passe mis à jour.",
} as const;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return AUTH_MESSAGES.emailRequired;
  if (!EMAIL_PATTERN.test(trimmed)) return AUTH_MESSAGES.emailInvalid;
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < MIN_PASSWORD_LENGTH) return AUTH_MESSAGES.passwordMinLength;
  return null;
}

export function passwordResetCooldownMessage(minutes: number): string {
  return `Un email a déjà été envoyé à cette adresse. Réessayez dans ${minutes} minutes ou consultez votre boîte de réception.`;
}
