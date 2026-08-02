const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("../../db");

const { generateToken } = require("../utils/jwt");
const { toUserDTO } = require("../utils/userDto");

const DEFAULT_THEME = "aurora";

/* ---------------- REGISTER ---------------- */

exports.register = async ({
    username,
    nickname,
    password
}) => {

    if (!username || !password) {
        throw new Error("Username and password are required.");
    }

    username = username.trim().toLowerCase();

    const existing =
        db.users.getByUsername(username);

    if (existing) {
        throw new Error("Username already exists.");
    }

    const passwordHash =
        await bcrypt.hash(password, 10);

    const user =
        db.users.create({

            id:
                "usr_" +
                crypto.randomUUID()
                    .replace(/-/g, "")
                    .substring(0, 12),

            username,

            nickname:
                nickname?.trim() || username,

            avatar: null,

            theme: DEFAULT_THEME,

            passwordHash,

            createdAt:
                new Date().toISOString()

        });

    return {

        token:
            generateToken(user),

        user:
            toUserDTO(user)

    };

};

/* ---------------- LOGIN ---------------- */

exports.login = async ({
    username,
    password
}) => {

    if (!username || !password) {
        throw new Error("Missing credentials.");
    }

    username = username.trim().toLowerCase();

    const user =
        db.users.getByUsername(username);

    if (!user) {
        throw new Error("Invalid username or password.");
    }

    const ok =
        await bcrypt.compare(
            password,
            user.passwordHash
        );

    if (!ok) {
        throw new Error("Invalid username or password.");
    }

    return {

        token:
            generateToken(user),

        user:
            toUserDTO(user)

    };

};

/* ---------------- CURRENT USER ---------------- */

exports.getCurrentUser = (id) => {

    const user =
        db.users.getById(id);

    if (!user) {
        throw new Error("User not found.");
    }

    return toUserDTO(user);

};

/* ---------------- UPDATE PROFILE ---------------- */

exports.updateProfile = async (

    id,

    {

        nickname,

        avatar,

        password,

        theme

    }

) => {

    const user =
        db.users.getById(id);

    if (!user) {
        throw new Error("User not found.");
    }

    if (nickname !== undefined)
        user.nickname = nickname;

    if (avatar !== undefined)
        user.avatar = avatar;

    if (theme !== undefined)
        user.theme = theme;

    if (password) {

        user.passwordHash =
            await bcrypt.hash(
                password,
                10
            );

    }

    db.users.update(user);

    return toUserDTO(user);

};

/* ---------------- GOOGLE LOGIN ---------------- */

exports.googleLogin = async ({

    email,

    username,

    nickname,

    avatar

}) => {

    if (!email) {
        throw new Error(
            "Google account email missing."
        );
    }

    let user =
        db.users.getByEmail(email);

    if (!user) {

        let finalUsername =
            username.toLowerCase();

        let i = 1;

        while (
            db.users.getByUsername(
                finalUsername
            )
        ) {

            finalUsername =
                username + i++;

        }

        user =
            db.users.create({

                id:
                    "usr_" +
                    crypto.randomUUID()
                        .replace(/-/g, "")
                        .substring(0, 12),

                username:
                    finalUsername,

                nickname:
                    nickname ||
                    finalUsername,

                avatar:
                    avatar || null,

                email,

                theme:
                    DEFAULT_THEME,

                passwordHash: null,

                createdAt:
                    new Date().toISOString()

            });

    }

    return {

        token:
            generateToken(user),

        user:
            toUserDTO(user)

    };

};

/* ---------------- LOGOUT ---------------- */

exports.logout = () => true;