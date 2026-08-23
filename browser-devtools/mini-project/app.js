// Two real, intentional bugs live in this file - the kind that actually ship
// to production because they don't crash anything, they just waste network
// and memory. Find them using DevTools per the README before reading the
// "Bug" comments below too closely.

const searchInput = document.getElementById("search");
const resultsEl = document.getElementById("results");
const clockEl = document.getElementById("clock");

async function fetchProducts(query) {
  const res = await fetch("https://jsonplaceholder.typicode.com/users");
  const users = await res.json();
  return users
    .map((u) => u.name)
    .filter((name) => name.toLowerCase().includes(query.toLowerCase()));
}

function renderResults(names) {
  resultsEl.innerHTML = names.map((n) => `<li>${n}</li>`).join("");
}

// BUG 1 (Network tab): every single keystroke fires its own fetch, with no
// debounce and no cancellation of the previous in-flight request. Typing a
// 5-letter word fires 5 full network requests, and because they can resolve
// out of order, the results can flicker to a stale, wrong result. Look at
// the Network tab while typing to see this happen in real time.
searchInput.addEventListener("input", async (e) => {
  const query = e.target.value;
  const names = await fetchProducts(query);
  renderResults(names);
});

// BUG 2 (Memory / Performance tab): startClock() creates a new setInterval
// every time it's called, but never clears the previous one. It's only
// called once here, so it looks harmless in a 30-second demo - but this
// exact pattern (re-running a "start" function without clearing the old
// timer first, e.g. on every re-render in a real app) is one of the most
// common real-world causes of memory leaks and runaway CPU usage in
// long-running pages. Call startClock() again from the Console to see
// duplicate ticking start immediately.
let clockStarted = 0;
function startClock() {
  clockStarted++;
  console.log(`startClock() called - this is call #${clockStarted}`);
  setInterval(() => {
    clockEl.textContent = `Live clock: ${new Date().toLocaleTimeString()} (from timer #${clockStarted})`;
  }, 1000);
}

startClock();

// Initial load with an empty query so the page isn't blank.
fetchProducts("").then(renderResults);
