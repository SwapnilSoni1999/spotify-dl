export function cleanOutputPath(output) {
  return output ? output.replace(/[&\/\\#+$!"~.%:*?<>{}\|]/g, '') : '';
}

export function removeQuery(url) {
  return url.split('?')[0];
}

export function splitDates(dateString) {
  const dateSplits = dateString && dateString.split('-');
  return {
    year: dateSplits && dateSplits.length > 0 ? dateSplits[0] : '',
    month: dateSplits && dateSplits.length > 1 ? dateSplits[1] : '',
    day: dateSplits && dateSplits.length > 2 ? dateSplits[2] : '',
  };
}