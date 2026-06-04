# CV Data Schema

`cv-template.html` expects `cv-data.js` to define one global variable:

```js
const CV = {
	meta: {
		name: "Full Name",
		title: "Target Role",
		contact: [
			{ label: "email@example.com", href: "mailto:email@example.com" },
			{ label: "Ho Chi Minh City, Vietnam" }
		]
	},
	profile: "Short professional summary.",
	education: {
		school: "University",
		degree: "Degree",
		gpa: "8.0 / 10"
	},
	languages: [
		{ name: "English", level: "Fluent" }
	],
	skills: [
		{ label: "Frontend", items: ["React", "TypeScript"] }
	],
	projects: [
		{
			name: "Project Name",
			company: "Company",
			period: "Jan 2024 - Present",
			role: "Software Engineer",
			teamSize: 10,
			description: "One short paragraph.",
			responsibilities: ["Led delivery of ..."],
			technical: ["Built with ..."],
			tags: ["React", "TypeScript"]
		}
	],
	petProjects: []
};
```

## Required Fields

Ask the user before finalizing if any of these are missing:

- `meta.name`
- `meta.title`
- at least one `meta.contact` item
- `profile`
- at least one `skills` group
- at least one `projects` item

For each main project, ask if any of these are missing:

- `name`
- `period`
- `role`
- `description`
- at least one `responsibilities` item

## Recommended Fields

Use these when available, but do not block final generation unless the user asks for a stricter CV:

- `education`
- `languages`
- project `company`
- project `technical`
- project `tags`
- `petProjects`
