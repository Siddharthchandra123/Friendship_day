#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const IGNORE = [
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage"
];

const replacements = [

    // Users

    [
        /\bdb\.getUserByUsername\s*\(/g,
        "db.users.getByUsername("
    ],

    [
        /\bdb\.getUserById\s*\(/g,
        "db.users.getById("
    ],

    [
        /\bdb\.getUserByEmail\s*\(/g,
        "db.users.getByEmail("
    ],

    [
        /\bdb\.createUser\s*\(/g,
        "db.users.create("
    ],

    [
        /\bdb\.updateUser\s*\(/g,
        "db.users.update("
    ],

    // Posts

    [
        /\bdb\.getPosts\s*\(/g,
        "db.posts.getAll("
    ],

    [
        /\bdb\.createPost\s*\(/g,
        "db.posts.create("
    ],

    [
        /\bdb\.deletePost\s*\(/g,
        "db.posts.delete("
    ],

    [
        /\bdb\.toggleLike\s*\(/g,
        "db.posts.toggleLike("
    ],

    // Audit

    [
        /\bdb\.logAuditEvent\s*\(/g,
        "db.audit.log("
    ]

];

function walk(dir) {

    let files = [];

    for (const item of fs.readdirSync(dir)) {

        if (IGNORE.includes(item))
            continue;

        const full = path.join(dir, item);

        const stat = fs.statSync(full);

        if (stat.isDirectory()) {

            files.push(...walk(full));

        } else {

            if (/\.(js|jsx|ts|tsx)$/.test(item)) {

                files.push(full);

            }

        }

    }

    return files;

}

const files = walk(ROOT);

let changed = 0;

for (const file of files) {

    let code = fs.readFileSync(file, "utf8");

    const original = code;

    for (const [find, replace] of replacements) {

        code = code.replace(find, replace);

    }

    if (code !== original) {

        fs.writeFileSync(file + ".bak", original);

        fs.writeFileSync(file, code);

        console.log("✔", path.relative(ROOT, file));

        changed++;

    }

}

console.log();
console.log("-------------------------");
console.log("Migration Complete");
console.log("Files Updated:", changed);
console.log("-------------------------");