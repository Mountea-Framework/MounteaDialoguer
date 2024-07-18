import { useEffect } from "react";

const saveProjectToLocalStorage = (projectData) => {
  localStorage.setItem("autoSaveProject", JSON.stringify(projectData));
};

const useAutoSave = (categories, participants) => {
  useEffect(() => {
    if (categories && participants) {
      saveProjectToLocalStorage({ categories, participants });
    }
  }, [categories, participants]);
};

export default useAutoSave;
