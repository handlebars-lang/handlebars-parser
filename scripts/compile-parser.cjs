const cli = require('jison/lib/cli');

// This is a workaround for https://github.com/zaach/jison/pull/352 having never been merged
const oldProcessGrammars = cli.processGrammars;

cli.processGrammars = function (...args) {
  const grammar = oldProcessGrammars.call(this, ...args);
  grammar.options = grammar.options ?? {};
  grammar.options['token-stack'] = true;
  return grammar;
};

cli.main({
  moduleType: 'js',
  file: 'src/handlebars.yy',
  lexfile: 'src/handlebars.l',
  outfile: 'lib/parser.js',
  'token-stack': true,
});
