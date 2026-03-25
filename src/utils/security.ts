
import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML para prevenir XSS
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitiza texto simples removendo caracteres perigosos
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida senha forte
 */
export function isStrongPassword(password: string): boolean {
  // Pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Escapa caracteres especiais para uso em regex
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Valida entrada de arquivo
 */
export function validateFileUpload(file: File, allowedTypes: string[], maxSize: number): string | null {
  if (!allowedTypes.includes(file.type)) {
    return 'Tipo de arquivo não permitido';
  }
  
  if (file.size > maxSize) {
    return `Arquivo muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`;
  }
  
  return null;
}
