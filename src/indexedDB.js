import { openDB } from "idb";

let dbPromise;

const openDatabase = async () => {
	if (!dbPromise) {
		dbPromise = openDB("projectDB", 1, {
			upgrade(db) {
				if (!db.objectStoreNames.contains("projects")) {
					db.createObjectStore("projects", { keyPath: "guid" });
				}
			},
		});
	}
	return dbPromise;
};

export const getDB = async () => {
	return await openDatabase();
};
