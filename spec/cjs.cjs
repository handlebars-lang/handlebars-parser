const assert = require('node:assert');
const { parse, print } = require('@handlebars/parser');

describe('commonjs', function () {
  it('loads with require', function () {
    assert.strictEqual(print(parse('{{foo}}')), '{{ p%foo }}\n');
  });
});
