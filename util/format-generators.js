import Constants from './constants.js';

const {
  YOUTUBE_SEARCH: { VALID_CONTEXTS },
} = Constants;

export function generateTemplateString(
  itemName,
  albumName,
  artistName,
  format,
) {
  const contexts = format.match(/(?<=\{).+?(?=\})/g);
  const invalidContexts = contexts.filter(
    context => !VALID_CONTEXTS.includes(context),
  );
  if (invalidContexts.length > 0 || !contexts.length) {
    throw new Error(`Invalid search contexts: ${invalidContexts}`);
  }

  contexts.forEach(
    context => (format = format.replace(`{${context}}`, eval(context))),
  );

  return format;
}
