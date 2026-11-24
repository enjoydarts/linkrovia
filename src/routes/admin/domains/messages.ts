import { uiMessages, type Locale } from '$lib/i18n/locale';

type Messages = ReturnType<typeof uiMessages>;

export type DomainMessages = Messages['domains'] & {
  statuses: Record<string, string>;
  errors: Record<string, string>;
};

export type AutomaticDomainMessages = Messages['automaticDomain'];

export function domainMessages(locale: Locale): DomainMessages {
  return uiMessages(locale).domains;
}

export function domainVerificationMessages(
  locale: Locale,
): Record<string, string> {
  return uiMessages(locale).domainVerification;
}

export function automaticDomainMessages(
  locale: Locale,
): AutomaticDomainMessages {
  return uiMessages(locale).automaticDomain;
}

export function domainOperationMessages(
  locale: Locale,
): Record<string, string> {
  return uiMessages(locale).domainOperations;
}

export function managementDomainMessages(locale: Locale) {
  return uiMessages(locale).managementDomain;
}
