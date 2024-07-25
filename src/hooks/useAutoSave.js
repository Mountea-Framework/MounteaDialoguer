import { useEffect } from "react";

import mergeWithExistingData from "../helpers/autoSaveHelpers";

const saveProjectToLocalStorage = (projectData) => {
	const mergedData = mergeWithExistingData(projectData);
	localStorage.setItem("autoSaveProject", JSON.stringify(mergedData));
};

const useAutoSave = (name, categories, participants) => {
	useEffect(() => {
		if (name && categories && participants) {
			saveProjectToLocalStorage({ name, categories, participants });
		}
	}, [name, categories, participants]);

	return { saveProjectToLocalStorage };
};

export default useAutoSave;
