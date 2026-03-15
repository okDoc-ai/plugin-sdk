#!/usr/bin/env node

/**
 * scripts/release.mjs — Interactive release preparation script.
 *
 * Usage:  node scripts/release.mjs <version>
 * Example: node scripts/release.mjs 1.2.0
 *
 * Steps (each prompts yes / skip / cancel):
 *   1. Check for uncommitted changes
 *   2. Bump version in package.json (single source of truth)
 *   3. Build (npm run build:all — auto-stamps version everywhere)
 *   4. Commit version bump + build output
 *   5. Create git tag
 *   6. Push to origin
 *
 * On push, GitHub Actions will automatically:
 *   - Create a GitHub Release with artifacts
 *   - Publish to npm with provenance
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Helpers ──────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
    return new Promise((resolve) => {
        rl.question(`${question} [yes / skip / cancel]: `, (answer) => {
            const a = answer.trim().toLowerCase();
            if (a === 'yes' || a === 'y') resolve('yes');
            else if (a === 'skip' || a === 's') resolve('skip');
            else resolve('cancel');
        });
    });
}

function run(cmd) {
    console.log(`  $ ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit' });
}

function replaceInFile(filePath, search, replacement) {
    const abs = resolve(root, filePath);
    const content = readFileSync(abs, 'utf8');
    if (!content.includes(search)) {
        console.error(`  ✗ Could not find "${search}" in ${filePath}`);
        process.exit(1);
    }
    writeFileSync(abs, content.replace(search, replacement), 'utf8');
    console.log(`  ✔ ${filePath}`);
}

// ── Grab version from CLI arg ────────────────────────────────────────────────

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+/.test(newVersion)) {
    console.error('Usage: node scripts/release.mjs <version>');
    console.error('Example: node scripts/release.mjs 1.2.0');
    process.exit(1);
}

const tag = `v${newVersion}`;

// Read current version from package.json
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const oldVersion = pkg.version;

console.log();
console.log(`  Release: ${oldVersion} → ${newVersion} (tag: ${tag})`);
console.log();

// ── Step 1: Check uncommitted changes ────────────────────────────────────────

{
    const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
    if (status) {
        console.log('⚠ Uncommitted changes detected:\n');
        console.log(status);
        console.log();
        const answer = await ask('Continue anyway?');
        if (answer === 'cancel') { rl.close(); process.exit(0); }
    } else {
        console.log('✔ Working tree is clean.\n');
    }
}

// ── Step 2: Bump version in package.json ─────────────────────────────────────

{
    console.log(`Bump version ${oldVersion} → ${newVersion} in package.json?`);
    const answer = await ask('Proceed?');
    if (answer === 'cancel') { rl.close(); process.exit(0); }
    if (answer === 'yes') {
        replaceInFile('package.json', `"version": "${oldVersion}"`, `"version": "${newVersion}"`);

        console.log(`\n✔ package.json updated to ${newVersion}. Build will propagate to all source files.\n`);
    } else {
        console.log('  Skipped version bump.\n');
    }
}

// ── Step 3: Build ────────────────────────────────────────────────────────────

{
    console.log('Run build (npm run build:all)?');
    const answer = await ask('Proceed?');
    if (answer === 'cancel') { rl.close(); process.exit(0); }
    if (answer === 'yes') {
        run('npm run build:all');
        console.log('\n✔ Build succeeded.\n');
    } else {
        console.log('  Skipped build.\n');
    }
}

// ── Step 4: Commit ───────────────────────────────────────────────────────────

{
    console.log(`Commit all changes with message "release: v${newVersion}"?`);
    const answer = await ask('Proceed?');
    if (answer === 'cancel') { rl.close(); process.exit(0); }
    if (answer === 'yes') {
        run('git add -A');
        run(`git commit -m "release: v${newVersion}"`);
        console.log('\n✔ Committed.\n');
    } else {
        console.log('  Skipped commit.\n');
    }
}

// ── Step 5: Tag ──────────────────────────────────────────────────────────────

{
    console.log(`Create tag ${tag}?`);
    const answer = await ask('Proceed?');
    if (answer === 'cancel') { rl.close(); process.exit(0); }
    if (answer === 'yes') {
        run(`git tag ${tag}`);
        console.log(`\n✔ Tag ${tag} created.\n`);
    } else {
        console.log('  Skipped tagging.\n');
    }
}

// ── Step 6: Push ─────────────────────────────────────────────────────────────

{
    console.log(`Push to origin (branch + tag ${tag})?`);
    const answer = await ask('Proceed?');
    if (answer === 'cancel') { rl.close(); process.exit(0); }
    if (answer === 'yes') {
        run('git push origin HEAD --tags');
        console.log(`\n✔ Pushed. GitHub Actions will create the release for ${tag}.\n`);
    } else {
        console.log('  Skipped push.\n');
    }
}

console.log('Done.');
rl.close();
