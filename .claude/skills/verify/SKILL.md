---
name: verify
description: Verify a change in the running site by measuring the DOM rather than asserting it worked. Use after any edit to HTML, CSS or JS in this project, and whenever a screenshot times out. Covers the preview server, console errors, computed styles, the 375px overflow check and the derived-copy sweep.
---

# Verify in the browser, don't assert

There are no tests and no linter in this project. Verification is done in the
browser, and **screenshots in this environment time out often** — so the
reliable path is measurement, not pictures. Say that you measured.

## 1. Start the preview

```
preview_start {name: "vola"}
```

Port 8000, from `.claude/launch.json`. `serve.py` sends `no-store`: there are
no hashed filenames, so a cached `vola.css` means editing a file and seeing
nothing change. Never run the dev server through Bash.

## 2. Check for errors first

`read_console_messages {onlyErrors: true}` on each page you touched. A clean
console is the floor, not the ceiling.

## 3. Measure what you changed

Prefer `read_page` and `javascript_tool` over screenshots.

**Is an element actually hidden?** The attribute is not proof — measure:

```js
[...document.querySelectorAll('#checkout .field')].map(f => ({
  id: f.querySelector('input,select,textarea')?.id,
  h: Math.round(f.getBoundingClientRect().height)
}))
```

A hidden element reports `h: 0`. This is the check that caught `15a5294`.

**No horizontal scroll at 375px** — required after any change to a wide
element:

```
resize_window {preset: "mobile"}
```
```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

Must be `0`. Reset with `resize_window {preset: "desktop"}` when done.

**Did the derived copy survive?** This project's copy is computed from data,
and the recurring bug is a count reaching zero. Sweep the rendered text:

```js
const t = document.body.innerText.replace(/\s+/g,' ');
({ zeros: t.match(/\b0 [a-z]/g) || [], danglingList: /: \.|, \./.test(t) })
```

Filter facet counts are legitimately zero. A claim is not.

## 4. Show proof

A screenshot if it renders (`scale: 0.5` keeps it cheap), otherwise the
measurements. Do not ask the user to check manually.

## Note

If a screenshot times out with "the page did not finish rendering", the pane
may be behind another window. Fall back to `get_page_text`, `read_page` or
`javascript_tool` — and drive clicks with `element.click()` via
`javascript_tool` rather than coordinates.
