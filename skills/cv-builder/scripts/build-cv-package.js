#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

function usage() {
	console.error(
		[
			"Usage:",
			"  node build-cv-package.js --markdown <input.md> --output <output-dir> [--allow-incomplete]",
			"  node build-cv-package.js --data <cv-data.js> --output <output-dir>",
		].join("\n"),
	);
	process.exit(1);
}

function argValue(name) {
	const index = process.argv.indexOf(name);
	if (index === -1) return "";
	return process.argv[index + 1] || "";
}

const markdownPath = argValue("--markdown");
const dataPath = argValue("--data");
const outputDir = argValue("--output");
const allowIncomplete = process.argv.includes("--allow-incomplete");

if (!outputDir || (!markdownPath && !dataPath) || (markdownPath && dataPath)) usage();

const scriptDir = __dirname;
const skillDir = path.resolve(scriptDir, "..");
const templatePath = path.join(skillDir, "assets", "cv-template.html");
const outputDataPath = path.join(outputDir, "cv-data.js");
const outputHtmlPath = path.join(outputDir, "index.html");

function runNode(scriptPath, args) {
	const result = childProcess.spawnSync(process.execPath, [scriptPath, ...args], {
		stdio: "inherit",
	});
	if (result.error) throw result.error;
	return result.status || 0;
}

try {
	fs.mkdirSync(outputDir, { recursive: true });

	if (markdownPath) {
		const parseArgs = [markdownPath, outputDataPath];
		if (allowIncomplete) parseArgs.push("--allow-incomplete");
		const parseStatus = runNode(path.join(scriptDir, "parse-cv-markdown.js"), parseArgs);
		if (parseStatus !== 0) process.exit(parseStatus);
	} else {
		fs.copyFileSync(dataPath, outputDataPath);
	}

	const validateStatus = runNode(path.join(scriptDir, "validate-cv-data.js"), [outputDataPath]);
	if (validateStatus !== 0 && !allowIncomplete) process.exit(validateStatus);

	fs.copyFileSync(templatePath, outputHtmlPath);

	console.log(`Built CV package: ${outputDir}`);
	console.log(`Open ${outputHtmlPath} in a browser and print/save as PDF.`);
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
