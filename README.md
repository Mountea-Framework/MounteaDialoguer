[![Documentation](https://img.shields.io/badge/documentation-github?style=flat&logo=GitHub&labelColor=5a5a5a&color=98c510)](https://github.com/Mountea-Framework/MounteaDialoguer/wiki)
[![license](https://img.shields.io/badge/license-MPL%202.0-98c510?style=flat&labelColor=5a5a5a&link=https://raw.githubusercontent.com/Mountea-Framework/MounteaDialoguer/master/LICENSE)](https://github.com/Mountea-Framework/MounteaDialoguer/blob/master/LICENSE)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?style=flat&logo=youtube)](https://www.youtube.com/@mounteaframework)
[![Discord](https://badgen.net/discord/online-members/2vXWEEN?label=&logoColor=ffffff&color=7389D8&icon=discord)](https://discord.com/invite/2vXWEEN)
[![Discord](https://badgen.net/discord/members/2vXWEEN?label=&logo=discord&logoColor=ffffff&color=7389D8&icon=discord)](https://discord.com/invite/2vXWEEN)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/1fd7e368d04e485086aceae2d2d0350d)](https://app.codacy.com/gh/Mountea-Framework/MounteaDialoguer/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

# Mountea Dialoguer

Welcome to the Dialogue Editor Tool, a comprehensive solution for creating and managing dialogue systems for various applications. This tool offers an intuitive interface for designing dialogue flows, managing participants, and customizing interactions.

## Try it out!
Feel free to test out the released version of our Dialoguer Tool!
<p align="center" width="100%">
    <a href="https://mountea-framework.github.io/MounteaDialoguer/">
        <img width="20%" src="https://github.com/Mountea-Framework/MounteaInteractionSystem/assets/37410226/da51eced-84e4-4c96-a9ff-cd5a03055d64">
    </a>
</p>

## Features
- **Interactive Dialogue Canvas:** Easily create and edit dialogue nodes in easy to understand graph mode.
- **Participant Management:** Add and categorize dialogue participants.
- **Project Management:** Create, load, and manage multiple projects.
- **Customizable Styles:** Tailor the look and feel with custom CSS.
- **Auto-Save Functionality:** Ensures your work is saved periodically to prevent data loss.

## Showcase

<p align="center" width="100%">
     <img width="66%" src="https://github.com/user-attachments/assets/f8b90e96-f800-4722-be5f-57c8069979e2">
</p>

## Table of Contents
1. [Project Structure](#project-structure)
2. [Components Overview](#components-overview)
3. [Building the App](#building-the-app)
4. [Usage](#usage)
5. [Contributing](#contributing)
6. [License](#license)
7. [Acknowledgments](#acknowledgments)

## Project Structure

The project is organized in a way that separates components, hooks, and styles for better maintainability and scalability. Below is the structure of the project:

```
└── 📁src
    └── 📁base
        └── BaseNodesStyle.css
        └── BaseStyle.css
        └── ColorPalette.css
        └── ReactFlowOverride.css
    └── 📁components
        └── DialogueCanvas.js
        └── 📁dialogueEdges
            └── baseEdge.js
        └── DialogueEditor.js
        └── 📁dialogueNodes
            └── answerNode.js
            └── baseNode.js
            └── closeDialogueAutomaticNode.js
            └── closeDialogueNode.js
            └── jumpToNode.js
            └── leadNode.js
            └── startNode.js
        └── DialogueParticipants.js
        └── 📁editorComponents
            └── DialogueEditorCanvas.js
            └── DialogueEditorDetails.js
            └── DialogueEditorSettings.js
            └── DialogueEditorToolbar.js
            └── DialogueRow.js
            └── InfoModal.js
            └── ReportBug.js
            └── SpawnNewNode.js
        └── 📁general
            └── DialogueParticipantsHeader.js
            └── DialogueParticipantsList.js
            └── EditCategoryItem.js
            └── EditParticipantItem.js
            └── ParticipantCategoriesHeader.js
            └── ParticipantCategoriesList.js
        └── LandingPage.js
        └── LoadProject.js
        └── MobileView.js
        └── NewProject.js
        └── NewProjectDetails.js
        └── 📁objects
            └── Button.js
            └── Dropdown.js
            └── FileDrop.js
            └── Modal.js
            └── ReadOnlyText.js
            └── ScrollList.js
            └── ScrollListItem.js
            └── Slider.js
            └── Textblock.js
            └── TextInput.js
            └── Title.js
        └── ParticipantCategories.js
    └── 📁componentStyles
        └── DialogueCanvas.css
        └── DialogueEditor.css
        └── 📁dialogueNodes
            └── customNode.css
        └── DialogueParticipants.css
        └── 📁editorComponentStyles
            └── DialogueEditorCanvas.css
            └── DialogueEditorDetails.css
            └── DialogueEditorSettings.css
            └── DialogueEditorToolbar.css
        └── 📁editorObjects
            └── InfoModal.css
            └── ReportBug.css
        └── LandingPage.css
        └── LoadProject.css
        └── MobileView.css
        └── NewProject.css
        └── NewProjectDetails.css
        └── 📁objects
            └── Button.css
            └── Dropdown.css
            └── Modal.css
            └── ReadOnlyText.css
            └── ScrollList.css
            └── ScrollListItem.css
            └── Slider.css
            └── Textblock.css
            └── TextInput.css
            └── Title.css
        └── ParticipantCategories.css
    └── 📁config
        └── nodeForm.json
        └── projectDetails.json
    └── 📁contexts
        └── SelectionContext.js
    └── 📁helpers
        └── autoSaveHelpers.js
        └── debounce.js
        └── exportCategoriesHelper.js
        └── exportDialogueRowsHelper.js
        └── exportParticipantsHelper.js
        └── exportProjectHelper.js
        └── importCategoriesHelper.js
        └── importParticipantsHelper.js
        └── projectManager.js
        └── validationHelpers.js
    └── 📁hooks
        └── useAutoSave.js
        └── useAutoSaveNodesAndEdges.js
    └── 📁icons
        └── addIcon.svg
        └── bugReportIcon.svg
        └── deleteIcon.svg
        └── discordIcon.svg
        └── downloadIcon.svg
        └── editoIcon.svg
        └── favoriteIcon.svg
        └── helpIcon.svg
        └── redoIcon.svg
        └── removeIcon.svg
        └── searchIcon.svg
        └── settingsIcon.svg
        └── undoIcon.svg
        └── uploadIcon.svg
    └── App.css
    └── App.js
    └── App.test.js
    └── AppContext.js
    └── FileProvider.js
    └── index.css
    └── index.js
    └── indexedDB.js
    └── logo.svg
```

### Key Files and Folders

- **components/**: Contains all the React components used in the application.
  - **dialogueNodes/**: Components related to dialogue nodes such as `answerNode.js`, `baseNode.js`, etc.
  - **editorComponents/**: Components used in the dialogue editor like `DialogueEditorCanvas.js`, `DialogueEditorDetails.js`, etc.
  - **general/**: General components like `DialogueParticipantsHeader.js`, `DialogueParticipantsList.js`, etc.
  - **objects/**: Reusable UI components like buttons, dropdowns, modals, etc.
  - **DialogueCanvas.js**: The main container component for the dialogue canvas.
  - **DialogueEditor.js**: Main editor component.
  - **DialogueParticipants.js**: Manages dialogue participants.
  - **LandingPage.js**: The landing page component.
  - **LoadProject.js**: Component for loading existing projects.
  - **NewProject.js**: Component for creating a new project.
  - **NewProjectDetails.js**: Detailed view for configuring the new project.
  - **ParticipantCategories.js**: Manages participant categories.
- **componentStyles/**: CSS files for styling the components.
  - **editorComponentStyles/**: Styles for editor components.
  - **objects/**: Styles for UI components.
  - **dialogueNodes/**: Styles for dialogue nodes.
- **hooks/**: Custom React hooks.
  - **useAutoSave.js**: Hook that provides automatic saving functionality.
- **icons/**: SVG icons used in the application.
- **base/**: Base styles and CSS variables.

## Components Overview

The application is built with a variety of components organized into different categories for better maintainability and scalability. Here is an overview of the key components:

### Dialogue Nodes
- **answerNode.js**: Handles user answers in dialogues.
- **baseNode.js**: The base class for all dialogue nodes.
- **closeDialogueAutomaticNode.js**: Automatically closes the dialogue.
- **closeDialogueNode.js**: Manually closes the dialogue.
- **jumpToNode.js**: Jumps to a specific node in the dialogue.
- **leadNode.js**: Leads the conversation forward.
- **startNode.js**: The starting point of the dialogue.

### Editor Components
- **DialogueEditorCanvas.js**: The main canvas for editing dialogues.
- **DialogueEditorDetails.js**: Provides details for the dialogue editor.
- **DialogueEditorToolbar.js**: The toolbar with editing options.

### General Components
- **DialogueParticipantsHeader.js**: Header for the dialogue participants section.
- **DialogueParticipantsList.js**: List of dialogue participants.
- **EditCategoryItem.js**: Edit items in participant categories.
- **EditParticipantItem.js**: Edit individual participants.
- **ParticipantCategorierHeader.js**: Header for participant categories.
- **ParticipantCategoriesList.js**: List of participant categories.

### Objects
- **Button.js**: Reusable button component.
- **Dropdown.js**: Reusable dropdown component.
- **Modal.js**: Reusable modal component.
- **ScrollList.js**: Reusable scrollable list component.
- **ScrollListItem.js**: Items within the scrollable list.
- **TextInput.js**: Reusable text input component.
- **Title.js**: Reusable title component.

### Main Components
- **DialogueCanvas.js**: The main container component for the dialogue canvas.
- **DialogueEditor.js**: Main editor component for dialogues.
- **DialogueParticipants.js**: Manages dialogue participants.
- **LandingPage.js**: The landing page component.
- **LoadProject.js**: Component for loading existing projects.
- **NewProject.js**: Component for creating a new project.
- **NewProjectDetails.js**: Detailed view for configuring the new project.
- **ParticipantCategories.js**: Manages participant categories.


## Building the App

To build and run the app locally, follow these steps:

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

### Steps

1. **Clone the Repository**:
   ```sh
   git clone https://github.com/yourusername/dialogue-editor-tool.git
   ```

2. **Navigate to the Project Directory**:
   ```sh
   cd dialogue-editor-tool
   ```

3. **Install Dependencies**:
   ```sh
   npm install
   ```

4. **Start the Development Server**:
   ```sh
   npm start
   ```

   This will start the development server and open the app in your default browser. The app will automatically reload if you make changes to the code.

5. **Build the App for Production**:
   ```sh
   npm run build
   ```

   This will create a `build` folder with the production build of the app.

## Usage

### Creating a New Project

1. Open the app in your browser.
2. On the landing page, enter a project name and click "Continue".
3. Configure the project details, including participant categories and dialogue participants.
4. Click "Start" to begin working on the project.

### Loading an Existing Project

1. On the landing page, use the load project section to load an existing project from the list or upload a `.mnteadlg` file.

### Autosave

The app automatically saves the project data to local storage every time categories or participants are updated. This ensures that your work is not lost if you accidentally close the browser or navigate away from the app.

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

We appreciate the contributions from the open-source community and the following libraries that made this project possible:

- [React](https://reactjs.org/)
- [React Flow](https://reactflow.dev/)
- [React Transition Group](https://reactcommunity.org/react-transition-group/)
- [UUID](https://www.npmjs.com/package/uuid)
- [React ContentEditable](https://github.com/lovasoa/react-contenteditable)
- [React Tooltip](https://www.npmjs.com/package/react-tooltip)
- [JSZip](https://stuk.github.io/jszip/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM](https://github.com/testing-library/jest-dom)
- [User Event](https://github.com/testing-library/user-event)
- [Web Vitals](https://github.com/GoogleChrome/web-vitals)
- [Google Fonts](https://fonts.google.com/)
- [Google Icons](https://fonts.google.com/icons)
