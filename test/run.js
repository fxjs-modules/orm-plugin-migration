var fs      = require('fs');
var path    = require('path');
var helpers = require('./helpers');

var configPath = path.normalize(path.join(__dirname, 'config.js'));

if (!helpers.isTravis() && !fs.existsSync(configPath)) {
  console.error("test/config.js is missing. Take a look at test/config.example.js");
  process.exit(1);
}

function runTests() {
  var test = require('test');
  test.setup();

  require('./unit/migration_dsl_spec')

  require('./integration/add_drop_column_spec')
  require('./integration/indexes_spec')
  require('./integration/primary_keys_spec')
  require('./integration/error_handling_spec')
  require('./integration/migration_spec')
  require('./integration/rename_column_spec')
  require('./integration/foreign_keys_spec')

  if (helpers.protocol() !== 'sqlite')
    require('./integration/migrator_spec')
  // else
  //   require('./integration/migrator_spec_sqlite')

  test.run(console.DEBUG)
  process.exit()
}

var protocol = helpers.protocol();
var protocols = [];

if (protocol) {
  protocols = [protocol];
} else {
  protocols = Object.keys(helpers.config());
}

function run (err) {
  var pr = protocols.shift();
  if (err) {
    console.log(protocol, "tests failed");
    return process.exit(err);
  }
  if (!pr) return process.exit(0);

  process.env.ORM_PROTOCOL = pr;

  console.log(
    "\n\nRunning", pr, "tests",
    "\n------------------------"
  );
  
  runTests()
}

run();
