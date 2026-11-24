# Translation maintenance

The admin interface ships in English (`en`), Japanese (`ja`), Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Spanish (`es`), Italian (`it`), French (`fr`), German (`de`), Korean (`ko`), and Portuguese (`pt`). English is the fallback catalog. Keep all supported locales aligned when changing user-visible text.

## Add or change a message

1. Find the feature's section in `messages/en.json`. Each language has one JSON file under `messages/` with the same section names and message keys. Shared labels live under `shared`.
2. Write the English source string and update the matching entry for every locale. Preserve the meaning and intent instead of translating word for word. Keep product and provider names as proper names.
3. Preserve interpolation tokens, HTML entities, and keyboard or screen-reader context. Do not translate API fields, URL paths, scopes, status codes, database values, or identifiers that users must copy exactly.
4. Read feature text through `uiMessages(locale)` and shared labels through `messagesFor(locale)`. TypeScript helpers can format messages or choose which message to show. Store the translated text in the JSON catalogs.
5. Format and run the repository checks before submitting the change.

`messagesFor` resolves missing catalog entries to English at runtime. Translate every entry for each supported locale. Locale selection uses the user's saved preference, language cookie, browser language, instance default, then English. Regional browser tags such as `fr-CA`, `de-AT`, and `ko-KR` match their base languages. `pt-BR` and `pt-PT` share the Portuguese catalog. Simplified and Traditional Chinese use separate catalogs.

## Writing accessible UI text

- Give buttons and controls labels that describe their action. Icon-only controls need an accessible name.
- Keep validation and recovery messages specific enough to explain what the user can try next. Use the existing localized error messages instead of rendering raw exception text.
- Keep units and dates localizable. Use `Intl` formatting with the effective locale and time zone; do not build localized dates by concatenating translated fragments.
- Include visible labels or screen-reader-only labels for form controls. Do not rely on color or an icon alone to communicate status.
- Keep text concise enough for narrow screens and allow translated labels to wrap.

## Verify catalog changes

Use the pinned Node.js and npm versions from `.node-version` and `package.json`. Run the same checks used by CI:

```sh
npm run check
npm run lint
npm test
npm run build
npm run test:e2e
```

When a change affects the language picker or locale resolution, also verify saved preferences and representative browser language tags. For timezone-aware dates, verify the formatted output in at least one locale with a non-UTC time zone. Cloudflare provider behavior requires a separate deployment check; local translation tests do not verify it.
