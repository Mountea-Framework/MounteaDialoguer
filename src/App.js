import React from "react";
import { ReactFlowProvider } from "reactflow";

import LandingPage from "./components/LandingPage";
import DialogueCanvas from "./components/DialogueCanvas";
import { SelectionProvider } from "./contexts/SelectionContext";

import { AppProvider } from "./AppContext";
import { FileProvider } from "./FileProvider";

import "./App.css";
import "./base/ColorPalette.css";
import "./base/BaseStyle.css";

function App() {
	return (
		<AppProvider>
			<FileProvider>
				<SelectionProvider>
					<div id="App" className="App">
						<ReactFlowProvider>
							<DialogueCanvas>
								<LandingPage />
							</DialogueCanvas>
						</ReactFlowProvider>
						<footer className="footer">
							<p>app version: 0.0.0.1a</p>
						</footer>
					</div>
				</SelectionProvider>
			</FileProvider>
		</AppProvider>
	);
}

export default App;
