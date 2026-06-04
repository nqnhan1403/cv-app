---
name: cv-builder
description: Build a shareable browser-based CV from markdown by parsing CV content into cv-data.js, validating missing required information, and packaging it with a reusable HTML template. Use when a user wants to create, convert, update, validate, or share a CV/resume using markdown plus cv-template.html.
---

# CV Builder

Use this skill to convert a user's CV markdown into a shareable static CV package.

The final output should normally be:

```text
output-folder/
  index.html
  cv-data.js
```

The user opens `index.html` in a browser and prints/saves to PDF.

## Workflow

1. Read the user's markdown CV.
2. If the markdown format is unclear, compare it with `references/cv-markdown-format.md`.
3. Generate data with:

```sh
node scripts/parse-cv-markdown.js input.md output/cv-data.js
```

4. If the parser exits with missing required information, ask the user those questions. Do not invent critical facts.
5. After the user answers, update the markdown or generated data and rerun validation:

```sh
node scripts/validate-cv-data.js output/cv-data.js
```

6. Build the final browser package:

```sh
node scripts/build-cv-package.js --data output/cv-data.js --output output
```

Or build directly from markdown:

```sh
node scripts/build-cv-package.js --markdown input.md --output output
```

## Missing Information Policy

Ask the user before finalizing if any required field is missing. Required fields are documented in `references/cv-data-schema.md`.

Ask concise grouped questions. Prefer:

- personal/contact missing fields first
- target role/profile next
- missing project metadata next
- missing responsibilities last

Do not ask about optional fields unless they affect the user's stated goal.

## Assets

- `assets/cv-template.html`: copied to `index.html` in the output package.
- `assets/cv-data.example.js`: example data file generated from `examples/sample-cv.md`.

## Scripts

- `scripts/parse-cv-markdown.js`: converts markdown into `const CV = {...};`.
- `scripts/validate-cv-data.js`: validates a `cv-data.js` file and prints questions for missing required fields.
- `scripts/build-cv-package.js`: creates the final `index.html` + `cv-data.js` package.
