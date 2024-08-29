import { openDB } from "idb";

let dbPromise;

const openDatabase = async () => {
	if (!dbPromise) {
		dbPromise = openDB("projectDB", 2, {
			// Increment version to 2
			upgrade(db, oldVersion, newVersion) {
				if (oldVersion < 1) {
					if (!db.objectStoreNames.contains("projects")) {
						db.createObjectStore("projects", { keyPath: "guid" });
					}
				}
				if (oldVersion < 2) {
					if (!db.objectStoreNames.contains("files")) {
						db.createObjectStore("files", { keyPath: "path" });
					}
				}
			},
		});
	}
	return dbPromise;
};

export const getDB = async () => {
	return await openDatabase();
};
