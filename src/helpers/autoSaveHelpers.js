const mergeWithExistingData = (newData) => {
	const existingData =
		JSON.parse(localStorage.getItem("autoSaveProject")) || {};
	return { ...existingData, ...newData };
};

export default mergeWithExistingData;
