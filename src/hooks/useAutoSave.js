import { useEffect } from "react";

const saveProjectToLocalStorage = (projectData) => {
  localStorage.setItem("autoSaveProject", JSON.stringify(projectData));
};

const useAutoSave = (name, categories, participants) => {
  useEffect(() => {
    if (name && categories && participants) {
      saveProjectToLocalStorage({ name, categories, participants });
    }
  }, [name, categories, participants]);
};

export default useAutoSave;
