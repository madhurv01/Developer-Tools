// The "application" whose regression will (deliberately) get caught by CI
// before it ever reaches main - see the README for the actual GitHub
// Actions + Pull Request workflow this file supports.
function add(a, b) {
  return a + b;
}

module.exports = { add };
