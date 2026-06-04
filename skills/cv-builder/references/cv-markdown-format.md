# CV Markdown Format

Use this format when asking a user to provide or clean up CV markdown. The parser is intentionally simple and prefers explicit labels over inference.

```md
# Full Name

Title: Full Stack Software Engineer
Email: email@example.com
Phone: +84 ...
Location: Ho Chi Minh City, Vietnam
LinkedIn: linkedin.com/in/...
GitHub: github.com/...
Experience: 8 years of experience

## Profile

One concise professional summary paragraph.

## Skills

- **Languages**: TypeScript, JavaScript
- **Frontend**: React, Next.js, Redux
- **Backend & APIs**: Node.js, NestJS, GraphQL, REST
- **Cloud & DevOps**: AWS, Docker, Jenkins

## Education

School: Ton Duc Thang University
Degree: B.S. Computer Science
GPA: 8.0 / 10

## Languages

- Vietnamese: Native
- English: Fluent

## Projects

### Project Name

Company: Company Name
Period: Jan 2024 - Present
Role: Software Engineer
Team size: 10
Description: One short paragraph explaining product/domain/context.
Tags: React, TypeScript, GraphQL

#### Responsibilities

- Led ...
- Built ...

#### Technical Highlights

- Built with ...
- Integrated ...

## Pet Projects

### Side Project Name

Period: Mar 2024 - Present
Role: Solo Developer
Description: One short paragraph.
Tags: Next.js, TypeScript

#### Responsibilities

- Designed ...

#### Technical Highlights

- Built with ...
```

## Parsing Rules

- The first `#` heading becomes `meta.name` unless `Name:` is provided.
- Top-level key-value lines before `## Profile` become metadata.
- `## Skills` accepts bullet lines like `- **Label**: item, item`.
- `## Projects` and `## Pet Projects` must use `###` for each project.
- Project metadata should use `Company:`, `Period:`, `Role:`, `Team size:`, `Description:`, and `Tags:`.
- Project bullets must be under `#### Responsibilities` or `#### Technical Highlights`.

## Missing Information Policy

If important information is missing, ask the user for it before finalizing. Do not invent names, contact details, target roles, project periods, project roles, descriptions, or responsibilities.
