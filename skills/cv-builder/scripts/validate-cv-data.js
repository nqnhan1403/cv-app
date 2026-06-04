#!/usr/bin/env node

const fs = require("fs");

function usage() {
	console.error("Usage: node validate-cv-data.js <cv-data.js>");
	process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) usage();

function loadCvData(filePath) {
	const source = fs.readFileSync(filePath, "utf8");
	return new Function(`${source}\n; return CV;`)();
}

function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
	return typeof value === "string" && value.trim().length > 0;
}

function addMissing(items, field, question) {
	items.push({ field, question });
}

function validate(cv) {
	const missing = [];
	const warnings = [];

	if (!isObject(cv)) {
		addMissing(missing, "CV", "cv-data.js must define a global CV object.");
		return { missing, warnings };
	}

	if (!isObject(cv.meta)) {
		addMissing(missing, "meta", "What personal metadata should be used for this CV?");
	} else {
		if (!nonEmptyString(cv.meta.name)) {
			addMissing(missing, "meta.name", "What is the candidate's full name?");
		}
		if (!nonEmptyString(cv.meta.title)) {
			addMissing(missing, "meta.title", "What target role/title should appear below the name?");
		}
		if (!Array.isArray(cv.meta.contact) || cv.meta.contact.length === 0) {
			addMissing(
				missing,
				"meta.contact",
				"What contact line should be shown, such as email, phone, location, LinkedIn, or GitHub?",
			);
		} else {
			cv.meta.contact.forEach((contact, index) => {
				if (!isObject(contact) || !nonEmptyString(contact.label)) {
					addMissing(
						missing,
						`meta.contact[${index}].label`,
						`What label should be used for contact line ${index + 1}?`,
					);
				}
			});
		}
	}

	if (!nonEmptyString(cv.profile)) {
		addMissing(missing, "profile", "What profile summary should the CV use?");
	}

	if (!Array.isArray(cv.skills) || cv.skills.length === 0) {
		addMissing(missing, "skills", "What skill groups should be shown?");
	} else {
		cv.skills.forEach((group, index) => {
			if (!isObject(group) || !nonEmptyString(group.label)) {
				addMissing(missing, `skills[${index}].label`, `What label should be used for skill group ${index + 1}?`);
			}
			if (!isObject(group)) return;
			if (!Array.isArray(group.items) || group.items.length === 0) {
				addMissing(missing, `skills[${index}].items`, `What skills belong in skill group ${index + 1}?`);
			}
		});
	}

	if (!Array.isArray(cv.projects) || cv.projects.length === 0) {
		addMissing(missing, "projects", "What work experience or projects should be included?");
	} else {
		cv.projects.forEach((project, index) => {
			const label = isObject(project) && nonEmptyString(project.name) ? project.name : `project ${index + 1}`;
			if (!isObject(project)) {
				addMissing(missing, `projects[${index}]`, `What details should be used for ${label}?`);
				return;
			}
			if (!nonEmptyString(project.name)) {
				addMissing(missing, `projects[${index}].name`, `What name should be used for project ${index + 1}?`);
			}
			if (!nonEmptyString(project.period)) {
				addMissing(missing, `projects[${index}].period`, `What period should be used for "${label}"?`);
			}
			if (!nonEmptyString(project.role)) {
				addMissing(missing, `projects[${index}].role`, `What role should be used for "${label}"?`);
			}
			if (!nonEmptyString(project.description)) {
				addMissing(missing, `projects[${index}].description`, `What short description should be used for "${label}"?`);
			}
			if (!Array.isArray(project.responsibilities) || project.responsibilities.length === 0) {
				addMissing(
					missing,
					`projects[${index}].responsibilities`,
					`What key responsibilities should be listed for "${label}"?`,
				);
			}
			if (!Array.isArray(project.technical) || project.technical.length === 0) {
				warnings.push({
					field: `projects[${index}].technical`,
					message: `No technical highlights found for "${label}".`,
				});
			}
		});
	}

	if (!cv.education) warnings.push({ field: "education", message: "No education section found." });
	if (!Array.isArray(cv.languages) || cv.languages.length === 0) {
		warnings.push({ field: "languages", message: "No languages section found." });
	}

	return { missing, warnings };
}

try {
	const cv = loadCvData(inputPath);
	const result = validate(cv);

	if (result.missing.length) {
		console.error("Missing required CV information. Ask the user before finalizing:");
		for (const item of result.missing) {
			console.error(`- ${item.field}: ${item.question}`);
		}
		if (result.warnings.length) {
			console.error("\nWarnings:");
			for (const item of result.warnings) console.error(`- ${item.field}: ${item.message}`);
		}
		process.exit(2);
	}

	console.log("cv-data.js is valid.");
	if (result.warnings.length) {
		console.log("Warnings:");
		for (const item of result.warnings) console.log(`- ${item.field}: ${item.message}`);
	}
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
