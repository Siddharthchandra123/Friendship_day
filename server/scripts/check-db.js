#!/usr/bin/env node

const fs=require("fs");
const path=require("path");

const ROOT=process.cwd();

const IGNORE=[
"node_modules",
".git",
"dist"
];

function scan(dir){

for(const item of fs.readdirSync(dir)){

if(IGNORE.includes(item))
continue;

const full=path.join(dir,item);

const stat=fs.statSync(full);

if(stat.isDirectory()){

scan(full);

}else{

if(/\.(js|jsx|ts|tsx)$/.test(item)){

const text=fs.readFileSync(full,"utf8");

if(text.includes("require(\"./db\")")||

text.includes("require('../db')")||

text.includes("require('../../db')"))

{

console.log(

path.relative(ROOT,full)

);

}

}

}

}

}

scan(ROOT);