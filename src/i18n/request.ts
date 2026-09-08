import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Read the locale from the environment. Ships as pt-BR (Brazilian
  // Portuguese) — the dictionaries in messages/ also cover en and ko.
  const locale = process.env.NEXT_PUBLIC_APP_LOCALE || 'pt-BR';

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    // Fallback to pt-BR if the dictionary for the requested locale
    // doesn't exist yet — every key is guaranteed present there.
    messages = (await import(`../../messages/pt-BR.json`)).default;
  }

  return {
    locale,
    messages
  };
});
