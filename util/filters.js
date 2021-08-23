export function cleanOutputPath(output) {
  return output ? output.replace(/[&\/\\#+$!"~.%:*?<>{}\|]/g, '') : '';
}

export function removeQuery(url) {
  return url.split('?')[0];
}
