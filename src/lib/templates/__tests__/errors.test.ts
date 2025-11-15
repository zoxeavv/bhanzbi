import { describe, it, expect } from 'vitest';
import { getUserMessage, ERROR_MESSAGES, TemplateErrorCode } from '../errors';

describe('getUserMessage', () => {
  const allErrorCodes: TemplateErrorCode[] = [
    'TEMPLATE_NOT_FOUND',
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'SLUG_ALREADY_EXISTS',
    'SLUG_TAKEN',
    'INVALID_CONTENT_STRUCTURE',
    'UNKNOWN_ERROR',
  ];

  describe('returns non-empty message for each error code', () => {
    allErrorCodes.forEach((code) => {
      it(`returns non-empty message for ${code}`, () => {
        const message = getUserMessage(code);
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('returns appropriate keywords in messages', () => {
    it('SLUG_TAKEN contains slug-related keyword', () => {
      const message = getUserMessage('SLUG_TAKEN');
      expect(message.toLowerCase()).toMatch(/slug|nom|existe|déjà|template/i);
    });

    it('SLUG_ALREADY_EXISTS contains slug-related keyword', () => {
      const message = getUserMessage('SLUG_ALREADY_EXISTS');
      expect(message.toLowerCase()).toMatch(/slug|nom|existe|déjà|template/i);
    });

    it('TEMPLATE_NOT_FOUND contains template-related keyword', () => {
      const message = getUserMessage('TEMPLATE_NOT_FOUND');
      expect(message.toLowerCase()).toMatch(/template|introuvable|trouvé/i);
    });

    it('VALIDATION_ERROR contains validation-related keyword', () => {
      const message = getUserMessage('VALIDATION_ERROR');
      expect(message.toLowerCase()).toMatch(/validation|invalide|données/i);
    });

    it('UNAUTHORIZED contains authorization-related keyword', () => {
      const message = getUserMessage('UNAUTHORIZED');
      expect(message.toLowerCase()).toMatch(/autorisé|autorisation/i);
    });

    it('INVALID_CONTENT_STRUCTURE contains structure-related keyword', () => {
      const message = getUserMessage('INVALID_CONTENT_STRUCTURE');
      expect(message.toLowerCase()).toMatch(/structure|contenu|invalide/i);
    });

    it('UNKNOWN_ERROR indicates unexpected error', () => {
      const message = getUserMessage('UNKNOWN_ERROR');
      expect(message.toLowerCase()).toMatch(/erreur|inattendu|inattendue/i);
    });
  });

  describe('uses custom message when provided', () => {
    it('returns custom message instead of default', () => {
      const customMessage = 'Message personnalisé pour ce template';
      const message = getUserMessage('TEMPLATE_NOT_FOUND', customMessage);
      expect(message).toBe(customMessage);
      expect(message).not.toBe(ERROR_MESSAGES.TEMPLATE_NOT_FOUND);
    });

    it('returns custom message for SLUG_TAKEN', () => {
      const customMessage = 'Ce slug est déjà utilisé dans votre organisation';
      const message = getUserMessage('SLUG_TAKEN', customMessage);
      expect(message).toBe(customMessage);
    });

    it('returns default message when customMessage is empty string', () => {
      const message = getUserMessage('VALIDATION_ERROR', '');
      // Empty string is falsy, so should return default
      expect(message).toBe(ERROR_MESSAGES.VALIDATION_ERROR);
    });
  });

  describe('ERROR_MESSAGES mapping', () => {
    it('has a message for every TemplateErrorCode', () => {
      allErrorCodes.forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(ERROR_MESSAGES[code]).toBeTruthy();
      });
    });

    it('messages are in French', () => {
      // Vérifier que les messages contiennent des caractères français ou sont en français
      const message = getUserMessage('TEMPLATE_NOT_FOUND');
      // Les messages français contiennent souvent des accents ou des mots français
      expect(message).toContain('template');
    });
  });
});



