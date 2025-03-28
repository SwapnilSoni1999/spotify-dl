export const cleanOutputPath = function (output) {
  return output ? output.replace(/[&/\\#+$!"~.%:*?<>{}|]/g, '') : '';
};

export const removeQuery = function (url) {
  return url.split('?')[0];
};

export const splitDates = function (dateString) {
  const dateSplits = dateString && dateString.split('-');

  return {
    year: dateSplits && dateSplits.length > 0 ? dateSplits[0] : '',
    month: dateSplits && dateSplits.length > 1 ? dateSplits[1] : '',
    day: dateSplits && dateSplits.length > 2 ? dateSplits[2] : '',
  };
};
