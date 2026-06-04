#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function usage() {
	console.error(
		"Usage: node parse-cv-markdown.js <input.md> <output.js> [--allow-incomplete]",
	);
	process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const inputPath = args[0];
const outputPath = args[1];
const allowIncomplete = args.includes("--allow-incomplete");

function stripInlineMarkup(value) {
	return value
		.replace(/^\s*[-*]\s+/, "")
		.replace(/\*\*/g, "")
		.replace(/^_+|_+$/g, "")
		.replace(/^\*+|\*+$/g, "")
		.trim();
}

function cleanValue(value) {
	return stripInlineMarkup(value)
		.replace(/\s{2,}/g, " ")
		.trim();
}

function toLines(markdown) {
	return markdown.replace(/\r\n?/g, "\n").split("\n");
}

function headingInfo(line) {
	const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
	if (!match) return null;
	return {
		level: match[1].length,
		title: stripInlineMarkup(match[2]).replace(/:$/, ""),
	};
}

function normalizeHeading(title) {
	return title
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function splitSections(lines, level) {
	const sections = [];
	let current = null;

	for (const line of lines) {
		const heading = headingInfo(line);
		if (heading && heading.level === level) {
			current = { title: heading.title, key: normalizeHeading(heading.title), lines: [] };
			sections.push(current);
		} else if (current) {
			current.lines.push(line);
		}
	}

	return sections;
}

function firstH1(lines) {
	for (const line of lines) {
		const heading = headingInfo(line);
		if (heading && heading.level === 1) return heading.title;
	}
	return "";
}

function keyValueFromLine(line) {
	const cleaned = line.trim();
	const match = /^(?:[-*]\s*)?(?:\*\*)?([^:*|]+?)(?:\*\*)?\s*:\s*(.+)$/.exec(cleaned);
	if (!match) return null;
	return {
		key: normalizeHeading(match[1]),
		rawKey: cleanValue(match[1]),
		value: cleanValue(match[2]),
	};
}

function parseKeyValues(lines) {
	const values = {};
	for (const line of lines) {
		const pair = keyValueFromLine(line);
		if (pair) values[pair.key] = pair.value;
	}
	return values;
}

function sectionText(section) {
	if (!section) return "";
	return section.lines
		.filter((line) => {
			const trimmed = line.trim();
			return trimmed && !headingInfo(trimmed);
		})
		.map((line) => line.replace(/^\s*[-*]\s+/, ""))
		.map(stripInlineMarkup)
		.join("\n")
		.trim();
}

function findSection(sections, keys) {
	return sections.find((section) => keys.includes(section.key));
}

function splitList(value) {
	if (!value) return [];
	return value
		.split(/,|;|\s+\|\s+/)
		.map(cleanValue)
		.filter(Boolean);
}

function parseSkills(section) {
	if (!section) return [];
	const groups = [];
	const seen = new Set();

	for (const line of section.lines) {
		const trimmed = line.trim();
		if (!trimmed || headingInfo(trimmed)) continue;
		const pair = keyValueFromLine(trimmed);
		if (pair) {
			const label = pair.rawKey;
			const items = splitList(pair.value);
			if (label && items.length && !seen.has(label.toLowerCase())) {
				seen.add(label.toLowerCase());
				groups.push({ label, items });
			}
		}
	}

	if (!groups.length) {
		const items = section.lines
			.filter((line) => /^\s*[-*]\s+/.test(line))
			.map(cleanValue)
			.filter(Boolean);
		if (items.length) groups.push({ label: "Skills", items });
	}

	return groups;
}

function parseEducation(section) {
	if (!section) return undefined;
	const values = parseKeyValues(section.lines);
	const school = values.school || values.university || values.education;
	const degree = values.degree || values.major || values.program;
	const gpa = values.gpa;

	if (school || degree || gpa) {
		return {
			school: school || "",
			degree: degree || "",
			...(gpa ? { gpa } : {}),
		};
	}

	const bullets = section.lines
		.filter((line) => /^\s*[-*]\s+/.test(line))
		.map(cleanValue)
		.filter(Boolean);
	if (!bullets.length) return undefined;

	return { school: bullets[0], degree: bullets[1] || "" };
}

function parseLanguages(section) {
	if (!section) return [];
	const languages = [];

	for (const line of section.lines) {
		const trimmed = line.trim();
		if (!trimmed || headingInfo(trimmed)) continue;

		const pair = keyValueFromLine(trimmed);
		if (pair) {
			languages.push({ name: pair.rawKey, level: pair.value });
			continue;
		}

		const cleaned = cleanValue(trimmed);
		const paren = /^(.+?)\s*\((.+?)\)$/.exec(cleaned);
		if (paren) {
			languages.push({ name: cleanValue(paren[1]), level: cleanValue(paren[2]) });
		} else if (cleaned) {
			languages.push({ name: cleaned, level: "" });
		}
	}

	return languages;
}

function parseContact(lines, values) {
	const allText = lines.join("\n");
	const contact = [];
	const add = (label, href) => {
		if (!label) return;
		if (contact.some((item) => item.label === label)) return;
		contact.push(href ? { label, href } : { label });
	};

	const email = values.email || values["e-mail"] || (allText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
	if (email) add(email, `mailto:${email}`);

	const phone = values.phone || values.mobile || values.tel;
	if (phone) add(phone);

	const location = values.location || values.address;
	if (location) add(location);

	const experience = values.experience || values["years-of-experience"];
	if (experience) add(experience);

	for (const [key, value] of Object.entries(values)) {
		if (["linkedin", "github", "portfolio", "website"].includes(key) && value) {
			const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
			add(value, href);
		}
	}

	return contact;
}

function parseProjectMeta(lines) {
	const values = parseKeyValues(lines);
	const meta = {};

	meta.company = values.company || values.organization || values.client;
	meta.period = values.period || values.from || values.duration || values.time;
	meta.role = values.role || values.title || values.position;
	meta.teamSize = values["team-size"] || values.team;
	meta.description = values.description || "";
	meta.tags = splitList(values.tags || values["tech-stack"] || values.technologies);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const rolePeriod = /^\*\*(.+?)\*\*\s*\|\s*(.+)$/.exec(trimmed);
		if (rolePeriod) {
			if (!meta.role) meta.role = cleanValue(rolePeriod[1]);
			if (!meta.period) meta.period = cleanValue(rolePeriod[2]);
			continue;
		}

		const teamSize = /team\s*size\s*:\s*([0-9]+)/i.exec(trimmed);
		if (teamSize && !meta.teamSize) meta.teamSize = teamSize[1];

		const italicDescription = /^\*Description:\s*(.+?)\*?$/.exec(trimmed);
		if (italicDescription && !meta.description) {
			meta.description = cleanValue(italicDescription[1]);
		}
	}

	if (meta.teamSize !== undefined) {
		const parsed = Number.parseInt(String(meta.teamSize).replace(/[^0-9]/g, ""), 10);
		if (Number.isFinite(parsed)) meta.teamSize = parsed;
		else delete meta.teamSize;
	}

	return meta;
}

function collectBullets(lines) {
	return lines
		.filter((line) => /^\s*[-*]\s+/.test(line))
		.map(cleanValue)
		.filter(Boolean);
}

function splitProjectBlocks(section) {
	const blocks = [];
	let current = null;

	for (const line of section.lines) {
		const heading = headingInfo(line);
		if (heading && heading.level === 3) {
			current = { name: heading.title, lines: [] };
			blocks.push(current);
		} else if (current) {
			current.lines.push(line);
		}
	}

	return blocks;
}

function parseProject(block) {
	const subSections = splitSections(block.lines, 4);
	const responsibility = findSection(subSections, [
		"responsibility",
		"responsibilities",
		"key-responsibilities",
	]);
	const technical = findSection(subSections, [
		"technical",
		"technical-highlights",
		"technical-stack",
		"tech-stack",
	]);

	const metaLines = [];
	let beforeFirstSubHeading = true;
	for (const line of block.lines) {
		const heading = headingInfo(line);
		if (heading && heading.level === 4) {
			beforeFirstSubHeading = false;
			continue;
		}
		if (beforeFirstSubHeading) metaLines.push(line);
	}

	const meta = parseProjectMeta(metaLines);
	let description = meta.description;
	if (!description) {
		description = metaLines
			.filter((line) => {
				const trimmed = line.trim();
				return trimmed && !keyValueFromLine(trimmed) && !/^\*\*(.+?)\*\*\s*\|/.test(trimmed);
			})
			.map(cleanValue)
			.filter(Boolean)
			.join(" ")
			.trim();
	}

	const project = {
		name: block.name,
		...(meta.company ? { company: meta.company } : {}),
		...(meta.period ? { period: meta.period } : {}),
		...(meta.role ? { role: meta.role } : {}),
		...(meta.teamSize ? { teamSize: meta.teamSize } : {}),
		description,
		responsibilities: responsibility ? collectBullets(responsibility.lines) : [],
		technical: technical ? collectBullets(technical.lines) : [],
		...(meta.tags.length ? { tags: meta.tags } : {}),
	};

	if (!project.tags && technical) {
		const techText = technical.lines.join("\n");
		const stackLine = technical.lines.find((line) => /,/.test(line) && !/^\s*[-*]\s+/.test(line));
		const stackFromSentence = /(?:built with|stack|technologies?)\s*:?\s*(.+)$/i.exec(techText);
		const tags = splitList(stackLine || (stackFromSentence && stackFromSentence[1]) || "");
		if (tags.length) project.tags = tags;
	}

	return project;
}

function parseProjects(section) {
	if (!section) return [];
	return splitProjectBlocks(section).map(parseProject);
}

function validate(cv) {
	const missing = [];
	const ask = (field, question) => missing.push({ field, question });

	if (!cv.meta.name) ask("meta.name", "What is the candidate's full name?");
	if (!cv.meta.title) ask("meta.title", "What target role/title should appear below the name?");
	if (!cv.meta.contact.length) {
		ask("meta.contact", "What contact line should be shown, such as email, phone, location, LinkedIn, or GitHub?");
	}
	if (!cv.profile) ask("profile", "What profile summary should the CV use?");
	if (!cv.skills.length) ask("skills", "What skill groups should be shown?");
	if (!cv.projects.length) ask("projects", "What work experience or projects should be included?");

	cv.projects.forEach((project, index) => {
		const prefix = `projects[${index}]`;
		if (!project.period) ask(`${prefix}.period`, `What period should be used for "${project.name}"?`);
		if (!project.role) ask(`${prefix}.role`, `What role should be used for "${project.name}"?`);
		if (!project.description) ask(`${prefix}.description`, `What short description should be used for "${project.name}"?`);
		if (!project.responsibilities.length) {
			ask(`${prefix}.responsibilities`, `What key responsibilities should be listed for "${project.name}"?`);
		}
	});

	return missing;
}

function parseMarkdown(markdown) {
	const lines = toLines(markdown);
	const h1 = firstH1(lines);
	const h2 = splitSections(lines, 2);
	const topLines = [];

	for (const line of lines) {
		const heading = headingInfo(line);
		if (heading && heading.level === 2) break;
		if (!(heading && heading.level === 1)) topLines.push(line);
	}

	const topValues = parseKeyValues(topLines);
	const profileSection = findSection(h2, ["profile", "summary", "professional-summary"]);
	const skillsSection = findSection(h2, ["skills", "technical-skills"]);
	const projectsSection = findSection(h2, [
		"projects",
		"experience",
		"work-experience",
		"professional-experience",
	]);
	const petProjectsSection = findSection(h2, ["pet-projects", "side-projects", "personal-projects"]);
	const educationSection = findSection(h2, ["education", "education-and-certifications"]);
	const languagesSection = findSection(h2, ["languages"]);

	const cv = {
		meta: {
			name: topValues.name || h1,
			title: topValues.title || topValues.role || topValues["target-role"] || "",
			contact: parseContact(lines, topValues),
		},
		profile: sectionText(profileSection),
		...(parseEducation(educationSection) ? { education: parseEducation(educationSection) } : {}),
		languages: parseLanguages(languagesSection),
		skills: parseSkills(skillsSection),
		projects: parseProjects(projectsSection),
		petProjects: parseProjects(petProjectsSection),
	};

	if (!cv.languages.length) delete cv.languages;
	if (!cv.petProjects.length) delete cv.petProjects;

	return cv;
}

function renderDataFile(cv) {
	return [
		"/**",
		" * CV data generated from markdown.",
		" * Edit this file only if you need manual final adjustments.",
		" */",
		"",
		`const CV = ${JSON.stringify(cv, null, "\t")};`,
		"",
	].join("\n");
}

function validateGeneratedJs(source) {
	const context = {};
	vm.createContext(context);
	vm.runInContext(`${source}\nthis.__cv = CV;`, context, { timeout: 1000 });
	return context.__cv;
}

try {
	const markdown = fs.readFileSync(inputPath, "utf8");
	const cv = parseMarkdown(markdown);
	const missing = validate(cv);

	if (missing.length && !allowIncomplete) {
		console.error("Missing required CV information. Ask the user before generating cv-data.js:");
		for (const item of missing) {
			console.error(`- ${item.field}: ${item.question}`);
		}
		process.exit(2);
	}

	const source = renderDataFile(cv);
	validateGeneratedJs(source);
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, source);

	if (missing.length) {
		console.error("Generated incomplete cv-data.js with missing information:");
		for (const item of missing) console.error(`- ${item.field}: ${item.question}`);
		process.exit(2);
	}

	console.log(`Generated ${outputPath}`);
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
