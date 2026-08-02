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

    // USERS

    [
        /db\.getUserByUsername\s*\(/g,
        "db.users.getByUsername("
    ],

    [
        /db\.getUserById\s*\(/g,
        "db.users.getById("
    ],

    [
        /db\.getUserByEmail\s*\(/g,
        "db.users.getByEmail("
    ],

    [
        /db\.createUser\s*\(/g,
        "db.users.create("
    ],

    [
        /db\.updateUser\s*\(/g,
        "db.users.update("
    ],

    // POSTS

    [
        /db\.getPosts\s*\(/g,
        "db.posts.getAll("
    ],

    [
        /db\.createPost\s*\(/g,
        "db.posts.create("
    ],

    [
        /db\.deletePost\s*\(/g,
        "db.posts.delete("
    ],

    // AUDIT

    [
        /db\.logAuditEvent\s*\(/g,
        "db.audit.log("
    ]

];

function scan(dir) {

    const files = [];

    for (const item of fs.readdirSync(dir)) {

        if (IGNORE.includes(item))
            continue;

        const full = path.join(dir, item);

        const stat = fs.statSync(full);

        if (stat.isDirectory()) {

            files.push(...scan(full));

        } else {

            if (
                /\.(js|jsx|ts|tsx)$/.test(item)
            ) {

                files.push(full);

            }

        }

    }

    return files;

}

const files = scan(ROOT);

let changed = 0;

for (const file of files) {

    let text = fs.readFileSync(
        file,
        "utf8"
    );

    const original = text;

    for (const [find, replace] of replacements) {

        text = text.replace(find, replace);

    }

    if (text !== original) {

        fs.writeFileSync(
            file + ".bak",
            original
        );

        fs.writeFileSync(
            file,
            text
        );

        changed++;

        console.log(
            "✔",
            path.relative(ROOT, file)
        );

    }

}

console.log();
console.log("----------------------");
console.log("Files Updated:", changed);
console.log("----------------------");