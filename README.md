# Mountea Dialoguer

## Showcase

<p align="center" width="100%">
     <img width="66%" src="https://github.com/user-attachments/assets/f8b90e96-f800-4722-be5f-57c8069979e2">
</p>

## Table of Contents
1. [Project Structure](#project-structure)
2. [Styling Structure](#styling-structure)
3. [Context Management](#context-management)
4. [Components Overview](#components-overview)
5. [Building the App](#building-the-app)
6. [Usage](#usage)

## Project Structure

The project is organized in a way that separates components, hooks, and styles for better maintainability and scalability. Below is the structure of the project:

```
src/
|-- components/
|   |-- objects/
|   |   |-- Button.js
|   |   |-- Dropdown.js
|   |   |-- ScrollList.js
|   |   |-- ScrollListItem.js
|   |   |-- TextInput.js
|   |   |-- Title.js
|   |-- DialogueCanvas.js
|   |-- DialogueParticipants.js
|   |-- LandingPage.js
|   |-- LoadProject.js
|   |-- NewProject.js
|   |-- NewProjectDetails.js
|   |-- ParticipantCategories.js
|-- hooks/
|   |-- useAutoSave.js
|-- componentStyles/
|   |-- objects/
|   |   |-- Button.css
|   |   |-- Dropdown.css
|   |   |-- ScrollList.css
|   |   |-- TextInput.css
|   |   |-- Title.css
|   |-- DialogueCanvas.css
|   |-- DialogueParticipants.css
|   |-- LandingPage.css
|   |-- LoadProject.css
|   |-- NewProject.css
|   |-- NewProjectDetails.css
|   |-- ParticipantCategories.css
|-- base/
|   |-- BaseStyle.css
|   |-- ColorPalette.css
|-- App.js
|-- AppContext.js
|-- index.js
```

### Key Files and Folders

- **components/**: Contains all the React components used in the application.
  - **objects/**: Reusable UI components like buttons, dropdowns, and input fields.
  - **DialogueCanvas.js**: The main container component that manages the state and renders different pages based on the context.
  - **LandingPage.js**: The landing page that allows users to create a new project or load an existing one.
  - **NewProject.js**: Component for creating a new project.
  - **NewProjectDetails.js**: Detailed view for configuring the new project.
  - **ParticipantCategories.js**: Manages participant categories.
  - **DialogueParticipants.js**: Manages dialogue participants.

- **hooks/**: Contains custom hooks used in the application.
  - **useAutoSave.js**: A custom hook that autosaves project data to local storage.

- **componentStyles/**: Contains CSS files for styling the components.
  - **objects/**: Styles for the reusable UI components.
  - **DialogueCanvas.css**: Styles for the DialogueCanvas component.
  - **LandingPage.css**: Styles for the LandingPage component.
  - **NewProject.css**: Styles for the NewProject component.
  - **NewProjectDetails.css**: Styles for the NewProjectDetails component.
  - **ParticipantCategories.css**: Styles for the ParticipantCategories component.
  - **DialogueParticipants.css**: Styles for the DialogueParticipants component.

- **base/**: Contains base styles and color palettes used throughout the application.
  - **BaseStyle.css**: Global styles for the application.
  - **ColorPalette.css**: Defines the color scheme used in the application.

- **App.js**: The root component that initializes the application and wraps it in the AppProvider for context.
- **AppContext.js**: Defines the context and provider for managing global state.
- **index.js**: Entry point of the application.

## Styling Structure

The styling in this project follows a modular approach where each component has its own CSS file. This makes it easier to manage and maintain styles specific to each component. The styles are organized as follows:

- **Base Styles**: Contained in the `base/` folder, these styles include global resets, common typography, and the color palette used across the app.
- **Component Styles**: Each component has a corresponding CSS file in the `componentStyles/` folder. This ensures that styles are scoped to the component, preventing unintended side effects.
- **Object Styles**: Reusable UI elements like buttons, inputs, and dropdowns have their styles in the `objects/` folder within `componentStyles/`.

### CSS File Naming

- **Button.css**: Styles for the Button component.
- **Dropdown.css**: Styles for the Dropdown component.
- **ScrollList.css**: Styles for the ScrollList component.
- **TextInput.css**: Styles for the TextInput component.
- **Title.css**: Styles for the Title component.
- **DialogueCanvas.css**: Styles for the DialogueCanvas component.
- **LandingPage.css**: Styles for the LandingPage component.
- **LoadProject.css**: Styles for the LoadProject component.
- **NewProject.css**: Styles for the NewProject component.
- **NewProjectDetails.css**: Styles for the NewProjectDetails component.
- **ParticipantCategories.css**: Styles for the ParticipantCategories component.
- **DialogueParticipants.css**: Styles for the DialogueParticipants component.

## Context Management

The app uses React Context for managing global state. The `AppContext.js` file defines the context and provider:

- **AppContext**: The context object that holds the state and functions.
- **AppProvider**: The provider component that wraps the app and provides the context values.

### AppContext.js

The context manages categories, participants, and the visibility of the landing page.

- **State Variables**:
  - `categories`: Array of categories.
  - `participants`: Array of participants.
  - `showLandingPage`: Boolean indicating whether the landing page is visible.

- **Functions**:
  - `addCategory`: Adds a new category.
  - `deleteCategory`: Deletes a category.
  - `setParticipants`: Sets the participants array.
  - `setCategories`: Sets the categories array.
  - `setShowLandingPage`: Toggles the visibility of the landing page.

## Components Overview

### DialogueCanvas.js

The main container component that manages the state and renders different pages based on the context.

### LandingPage.js

The landing page that allows users to create a new project or load an existing one.

### NewProject.js

Component for creating a new project. It transitions to `NewProjectDetails` upon entering a project name.

### NewProjectDetails.js

Detailed view for configuring the new project. It uses the `useAutoSave` hook to autosave project data.

### ParticipantCategories.js

Manages participant categories. Allows adding and deleting categories.

### DialogueParticipants.js

Manages dialogue participants. Participants can be assigned to categories.

## Building the App

To build and run the app locally, follow these steps:

### Prerequisites

- Node.js and npm installed on your machine.

### Steps

1. **Clone the Repository**:
   ```
   git clone https://github.com/Mountea-Framework/MounteaDialoguer
   ```

2. **Navigate to the Project Directory**:
   ```
   cd <project-directory>
   ```

3. **Install Dependencies**:
   ```
   npm install
   ```

4. **Start the Development Server**:
   ```
   npm start
   ```

   This will start the development server and open the app in your default browser. The app will automatically reload if you make changes to the code.

5. **Build the App for Production**:
   ```
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
