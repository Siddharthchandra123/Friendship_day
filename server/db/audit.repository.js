const path = require("path");
const storage = require("./storage");

const FILE = path.join(storage.DATA_DIR, "audit_logs.json");

exports.log = (event) => {
    const logs = storage.read(FILE);

    logs.push({
        ...event,
        createdAt: new Date().toISOString()
    });

    storage.write(FILE, logs);
};

exports.getAll = () => {
    return storage.read(FILE);
};