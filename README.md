# Mountea Dialoguer

Welcome to the Dialogue Editor Tool, a comprehensive solution for creating and managing dialogue systems for various applications. This tool offers an intuitive interface for designing dialogue flows, managing participants, and customizing interactions.

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
src/
|-- App.css
|-- App.js
|-- AppContext.js
|-- FileProvider.js
|-- base/
|   |-- BaseNodesStyle.css
|   |-- BaseStyle.css
|   |-- ColorPalette.css
|-- componentStyles/
|   |-- DialogueCanvas.css
|   |-- DialogueEditor.css
|   |-- DialogueParticipants.css
|   |-- LandingPage.css
|   |-- LoadProject.css
|   |-- NewProject.css
|   |-- NewProjectDetails.css
|   |-- ParticipantCategories.css
|   |-- dialogueNodes/
|   |   |-- customNode.css
|   |-- editorComponentStyles/
|   |   |-- DialogueEditorCanvas.css
|   |   |-- DialogueEditorDetails.css
|   |   |-- DialogueEditorToolbar.css
|   |-- objects/
|   |   |-- Button.css
|   |   |-- Dropdown.css
|   |   |-- Modal.css
|   |   |-- ScrollList.css
|   |   |-- ScrollListItem.css
|   |   |-- TextInput.css
|   |   |-- Title.css
|-- components/
|   |-- DialogueCanvas.js
|   |-- DialogueEditor.js
|   |-- DialogueParticipants.js
|   |-- LandingPage.js
|   |-- LoadProject.js
|   |-- NewProject.js
|   |-- NewProjectDetails.js
|   |-- ParticipantCategories.js
|   |-- dialogueEdges/
|   |   |-- baseEdge.js
|   |-- dialogueNodes/
|   |   |-- answerNode.js
|   |   |-- baseNode.js
|   |   |-- closeDialogueAutomaticNode.js
|   |   |-- closeDialogueNode.js
|   |   |-- jumpToNode.js
|   |   |-- leadNode.js
|   |   |-- startNode.js
|   |-- editorComponents/
|   |   |-- DialogueEditorCanvas.js
|   |   |-- DialogueEditorDetails.js
|   |   |-- DialogueEditorToolbar.js
|   |   |-- SpawnNewNode.js
|   |-- general/
|   |   |-- DialogueParticipantsHeader.js
|   |   |-- DialogueParticipantsList.js
|   |   |-- EditCategoryItem.js
|   |   |-- EditParticipantItem.js
|   |   |-- ParticipantCategoriesHeader.js
|   |   |-- ParticipantCategoriesList.js
|   |-- objects/
|   |   |-- Button.js
|   |   |-- Dropdown.js
|   |   |-- FileDrop.js
|   |   |-- Modal.js
|   |   |-- ScrollList.js
|   |   |-- ScrollListItem.js
|   |   |-- TextInput.js
|   |   |-- Title.js
|-- helpers/
|   |-- autoSaveHelpers.js
|   |-- importCategoriesHelper.js
|   |-- importParticipantsHelper.js
|-- hooks/
|   |-- useAutoSave.js
|   |-- useAutoSaveNodesAndEdges.js
|-- icons/
|   |-- addIcon.svg
|   |-- downloadIcon.svg
|   |-- editoIcon.svg
|   |-- favoriteIcon.svg
|   |-- helpIcon.svg
|   |-- redoIcon.svg
|   |-- removeIcon.svg
|   |-- searchIcon.svg
|   |-- settingsIcon.svg
|   |-- undoIcon.svg
|   |-- uploadIcon.svg
|-- index.css
|-- index.js
|-- logo.svg

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
- [React](https://react.dev/)
- [Redux](https://redux.js.org/)
- [React Flow](https://reactflow.dev/)
- [Google Fonts](https://fonts.google.com/)
- [Google Icons](https://fonts.google.com/icons)
