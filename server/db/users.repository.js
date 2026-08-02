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

exports.update = (user) => {

    const users = exports.getAll();

    const index = users.findIndex(
        u => u.id === user.id
    );

    if (index === -1)
        throw new Error("User not found");

    users[index] = user;

    storage.write(FILE, users);

    return user;

};

exports.delete = (id) => {

    const users = exports
        .getAll()
        .filter(u => u.id !== id);

    storage.write(FILE, users);

};