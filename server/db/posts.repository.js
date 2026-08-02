const path = require("path");

const storage = require("./storage");

const FILE = path.join(
    storage.DATA_DIR,
    "posts.json"
);

exports.getAll = () => {

    return storage.read(FILE);

};

exports.getById = (id) => {

    return exports
        .getAll()
        .find(
            p => p.id === id
        );

};

exports.saveAll = (posts) => {

    storage.write(FILE, posts);

};

exports.create = (post) => {

    const posts = exports.getAll();

    posts.unshift(post);

    exports.saveAll(posts);

    return post;

};

exports.delete = (id) => {

    const posts =
        exports
            .getAll()
            .filter(
                p => p.id !== id
            );

    exports.saveAll(posts);

};