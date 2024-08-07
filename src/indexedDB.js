import { openDB } from "idb";

const dbPromise = openDB("projectDB", 1, {
	upgrade(db) {
		db.createObjectStore("projects", { keyPath: "id", autoIncrement: true });
		db.createObjectStore("nodes", { keyPath: "id" });
		db.createObjectStore("edges", { keyPath: "id" });
		db.createObjectStore("categories", { keyPath: "name" });
		db.createObjectStore("participants", { keyPath: "name" });
		db.createObjectStore("files", { keyPath: "path" });
	},
});

export const getDB = async () => {
	return await dbPromise;
};
