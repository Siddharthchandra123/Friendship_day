const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function ensure(file) {

    if (!fs.existsSync(file)) {

        fs.writeFileSync(
            file,
            JSON.stringify([], null, 2)
        );

    }

}

function read(file) {

    ensure(file);

    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );

}

function write(file, data) {

    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2),
        "utf8"
    );

}

module.exports = {

    read,

    write,

    DATA_DIR

};