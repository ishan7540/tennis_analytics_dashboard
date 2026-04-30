// -------------------------------------------------------
// Shared MongoDB Query Logger
// Prints formatted query details to the terminal whenever
// an API route executes a MongoDB operation.
// -------------------------------------------------------

function logQuery(routeName, collection, operation, queryOrPipeline, resultCount) {
  const divider = '='.repeat(65);
  const timestamp = new Date().toLocaleTimeString();

  console.log('');
  console.log(divider);
  console.log(`| QUERY LOG  [${timestamp}]`);
  console.log(`| Route      : ${routeName}`);
  console.log(`| Collection : ${collection}`);
  console.log(`| Operation  : ${operation}`);
  console.log('| Query      :');
  console.log(divider);

  // Pretty-print the query/pipeline
  const queryStr = JSON.stringify(queryOrPipeline, null, 2);
  // Indent each line for readability
  const indented = queryStr.split('\n').map(line => '  ' + line).join('\n');
  console.log(indented);

  console.log(divider);
  if (resultCount !== undefined) {
    console.log(`| Results    : ${resultCount} document(s) returned`);
  }
  console.log(divider);
  console.log('');
}

module.exports = logQuery;
