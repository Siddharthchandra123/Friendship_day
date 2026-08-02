const path = require("path");

const storage = require("./storage");

const FILE = path.join(
    storage.DATA_DIR,
    "rooms.json"
);

exports.getAll = () => {

    return storage.read(FILE);

};

exports.saveAll = (rooms) => {

    storage.write(FILE, rooms);

};

exports.getById = (id) => {

    return exports
        .getAll()
        .find(
            r => r.id === id
        );

};

exports.create = (room) => {

    const rooms = exports.getAll();

    rooms.push(room);

    exports.saveAll(rooms);

    return room;

};