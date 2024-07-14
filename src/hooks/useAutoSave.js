import { useEffect } from 'react';

const saveProjectToLocalStorage = (projectData) => {
  localStorage.setItem('autoSaveProject', JSON.stringify(projectData));
};

const useAutoSave = (projectData) => {
  useEffect(() => {
    if (projectData && projectData.name) {
      saveProjectToLocalStorage(projectData);
    }
  }, [projectData]);
};

export default useAutoSave;
