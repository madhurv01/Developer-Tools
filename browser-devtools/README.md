# Browser DevTools

## What it is

Browser DevTools are the developer suite built into every modern browser (Chrome, Edge, Firefox, Safari): live HTML/CSS inspection and editing (**Elements**), a JavaScript console and step-through debugger (**Console** / **Sources**), full HTTP request/response inspection (**Network**), and runtime performance/memory profiling (**Performance** / **Memory**). It's the single most-used debugging tool in frontend development, precisely because it inspects the *actual running page*, not a simulation of it.

- Chrome DevTools docs: https://developer.chrome.com/docs/devtools/
- Firefox DevTools docs: https://firefox-source-docs.mozilla.org/devtools-user/

## Why this tool exists / the problem it solves

A web page is the product of HTML, CSS, and JavaScript all interacting live in the browser — bugs frequently only manifest at runtime, under real user interaction, and are invisible just from reading source code (a memory leak that only shows up after 10 minutes of use; a network request that fires more times than intended; a CSS rule that's being silently overridden by a more specific selector elsewhere). DevTools solves this by giving you direct, real-time visibility into what the browser is actually doing — the real DOM, the real network traffic, the real call stack — instead of forcing you to reason about it from source code alone.

## Why it matters in the AI era

AI-generated frontend code often *looks* correct and runs without throwing errors, while still having exactly the class of bug DevTools is built to catch: redundant network calls, memory leaks from uncleared timers/listeners, layout bugs from conflicting CSS. These bugs won't show up in a type-checker or a quick glance at the code — you have to actually run the page and watch it. DevTools is how you verify AI-written frontend code is actually correct, not just plausible-looking.

## Install
No install needed — it's built into every modern browser.
- Open with **F12** or **Ctrl+Shift+I** (Windows/Linux), **Cmd+Option+I** (Mac), or right-click any page → **Inspect**.
- To open directly to a specific panel: **Ctrl+Shift+J** (Chrome/Edge) jumps straight to the Console.

## Configure (worth knowing, not required)
- **Dock position**: the ⋮ menu in DevTools lets you dock it to the bottom, left, right, or pop it into its own window — undocking to a second monitor is genuinely useful for serious debugging sessions.
- **Preserve log** (Network/Console tabs): check this box to keep request/log history across page navigations — off by default, so logs vanish on reload unless you enable it. Critical when debugging something that happens *during* a page load or redirect.
- **Disable cache** (Network tab, while DevTools is open): forces every request to hit the network fresh instead of being served from cache — important when you're not sure if you're looking at stale cached data.
- **Throttling** (Network tab): simulate slow 3G/4G connections to see how your app behaves for real users on poor connections, not just your fast dev machine.

## Core use cases
- **Elements**: live-edit HTML/CSS to prototype UI changes instantly, inspect computed styles and exactly which CSS rule is winning.
- **Console**: run JS on the fly, view `console.log`/error output, inspect thrown exceptions with full stack traces.
- **Sources**: set breakpoints and step through JavaScript execution line by line, inspect variables in scope at any pause point.
- **Network**: inspect every HTTP request's headers, payload, timing, and response — see exactly what your JS is actually sending and receiving.
- **Performance / Memory**: profile CPU usage and memory growth over time to find jank and leaks.
- **Application**: inspect localStorage, sessionStorage, cookies, and service workers.

## Real-life scenario: diagnosing duplicate requests and a memory leak

These are two of the most common real-world frontend bugs — the kind that ship silently because nothing crashes, they just waste bandwidth, hammer your backend with redundant traffic, and slowly degrade performance on long-running pages (dashboards, SPAs left open all day). You'll diagnose both using DevTools the way you actually would on a real project, then fix them.

**What the mini project is:** a small product-search page ([mini-project/index.html](mini-project/index.html), [mini-project/app.js](mini-project/app.js)) with two real, intentional bugs left in.

### Setup
Open `mini-project/index.html` directly in your browser, then open DevTools (**F12**).

### Bug 1 — diagnose redundant network requests

1. Go to the **Network** tab, filter to **Fetch/XHR**.
2. Click into the search box and type a word slowly, letter by letter (e.g. `ana`).
3. Watch the Network panel: you'll see a **separate request fires for every single keystroke** — typing 3 letters fires 3 full requests to the same endpoint, each one independently completing. Click on a couple of them and check the **Timing** tab — you can see they genuinely overlap in flight, meaning whichever happens to *resolve last* wins, even if it's not the response for what's currently in the input box (a real, user-visible "flickering to wrong results" bug in production apps).
4. This is diagnosed. The real-world fix (already the standard pattern, worth knowing even though this project doesn't require you to implement it) is to **debounce** the input handler — wait ~300ms after the user stops typing before firing the request — and/or cancel the previous in-flight request with an `AbortController` when a new one starts.

### Bug 2 — diagnose a memory/timer leak

1. Go to the **Console** tab. You'll see `startClock() called - this is call #1` logged once on page load, and the clock on the page updating every second.
2. In the Console, manually call the function again to simulate what happens in a real app when a "start" function gets re-invoked without cleanup (e.g. a component re-rendering, a reconnect handler firing again):
   ```js
   startClock()
   startClock()
   startClock()
   ```
3. Watch the page: the clock text now updates erratically, and if you check the Console you'll see multiple `startClock() called` logs — you've now got **4 separate `setInterval` timers all running simultaneously**, each one still ticking forever, none of them ever cleared. This is exactly how real memory/CPU leaks happen — a "start" routine called repeatedly (on every re-render, every reconnect, every route change) without ever tearing down the previous instance.
4. Open the **Performance** tab, click **Record**, wait ~5 seconds, click **Stop**. Look at the **Main** thread track — you'll see a small recurring spike every second *for each* active timer, visually confirming multiple independent timers are firing instead of just one.
5. The real-world fix (again, worth understanding even if not required here): store the interval ID returned by `setInterval` and call `clearInterval` on it before starting a new one — the standard "clean up before you re-initialize" pattern that AI-generated code frequently forgets to include.

### Step-through bonus: use the Sources panel
1. Open the **Sources** tab, find `app.js` in the file tree on the left.
2. Click the line number next to `const names = await fetchProducts(query);` inside the input handler to set a breakpoint.
3. Type a character in the search box — execution pauses. Open the **Scope** panel to inspect the live value of `query` and `e.target.value` at that exact moment, and use the **Call Stack** panel to see exactly what triggered this code (the `input` event listener).

## Common pitfalls
- **Console/Network history disappearing on reload**: enable **Preserve log** if you need to see what happened right up to and during a navigation.
- **Seeing cached responses and thinking a bug is fixed when it isn't**: enable **Disable cache** while DevTools is open during active debugging.
- **Debugging minified production code**: use the "pretty print" `{}` button in the Sources panel to reformat minified JS into something readable before setting breakpoints in it.

## Resources
- Chrome DevTools docs: https://developer.chrome.com/docs/devtools/
- Network panel deep dive: https://developer.chrome.com/docs/devtools/network/
- Memory panel / finding leaks: https://developer.chrome.com/docs/devtools/memory-problems/
