# No build step: ES modules and node --test

The calculation modules (`conversions`, `calculations`, `uncertainty`,
`formatters`) are plain ES modules with no DOM access, imported unchanged by
both `<script type="module">` in the browser and Node's built-in test runner in
CI. There is no `package.json`, no lockfile, no `node_modules`, and no bundler.

This keeps the project auditable by a scientist reading the source directly,
and maintainable by another AI without reconstructing a toolchain — which is
the stated goal. It also means the code that ships is byte-for-byte the code
that was tested.

## Considered options

Vitest was rejected: better failure diffs and watch mode are not worth a
dependency tree in a project whose defining constraint is simplicity.

A hand-rolled browser test page was rejected because gating CI on it requires a
headless browser, which reintroduces exactly the tooling this decision avoids.

## Consequences

ES modules do not load over `file://`, so opening `index.html` by
double-clicking it will fail with a CORS error. Local development requires a
static server (`python3 -m http.server`). GitHub Pages serves over HTTP and is
unaffected. This trips people up; it is not a bug.

The calculation modules must stay free of DOM access, or they stop being
importable by Node and the whole arrangement collapses. Keep all DOM work in
`app.js`.
