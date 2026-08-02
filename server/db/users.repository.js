const path = require("path");

const crypto = require("crypto");

const storage = require("./storage");

const FILE = path.join(
    storage.DATA_DIR,
    "users.json"
);

exports.getAll = () => {

    return storage.read(FILE);

};

exports.getById = (id) => {

    return exports
        .getAll()
        .find(u => u.id === id);

};

exports.getByUsername = (username) => {

    return exports
        .getAll()
        .find(
            u =>
                u.username.toLowerCase() ===
                username.toLowerCase()
        );

};

exports.getByEmail = (email) => {

    return exports
        .getAll()
        .find(
            u =>
                u.email &&
                u.email.toLowerCase() ===
                email.toLowerCase()
        );

};

exports.create = ({

    id,

    username,

    nickname,

    passwordHash,

    avatar = null,

    email = null,

    theme = "aurora"

}) => {

    const users = exports.getAll();

    if (
        users.some(
            u =>
                u.username.toLowerCase() ===
                username.toLowerCase()
        )
    ) {

        throw new Error(
            "Username already exists."
        );

    }

    const user = {

        id:
            id ||
            "usr_" +
            crypto
                .randomUUID()
                .replace(/-/g, "")
                .substring(0, 12),

        username,

        nickname,

        passwordHash,

        avatar,

        email,

        theme,

        createdAt:
            new Date().toISOString()

    };

    users.push(user);

    storage.write(FILE, users);

    return user;

};