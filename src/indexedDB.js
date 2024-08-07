import { openDB } from "idb";

let dbPromise;

const openDatabase = async () => {
	if (!dbPromise) {
		dbPromise = openDB("projectDB", 1, {
			upgrade(db) {
				db.createObjectStore("projects", { keyPath: "guid" });
				db.createObjectStore("nodes", { keyPath: "id" });
				db.createObjectStore("edges", { keyPath: "id" });
				db.createObjectStore("files", { keyPath: "path" });
			},
		});
	}
	return dbPromise;
};

export const getDB = async () => {
	return await openDatabase();
};
