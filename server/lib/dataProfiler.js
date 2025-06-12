const Papa = require('papaparse');

// Simple CSV parser function - keeping your original structure
function parseCsv(csvString) {
  const parsed = Papa.parse(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  return parsed.data;
}

module.exports = {
  parseCsv
};