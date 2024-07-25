import React, { useState, useContext } from "react";

import TextInput from "../objects/TextInput";
import Dropdown from "../objects/Dropdown";
import Button from "../objects/Button";
import Title from "../objects/Title";
import AppContext from "../../AppContext";
import { FileContext } from "../../FileProvider";

import { ReactComponent as ImportIcon } from "../../icons/uploadIcon.svg";
import { ReactComponent as DownloadIcon } from "../../icons/downloadIcon.svg";

function ParticipantCategoriesHeader({ onUpdate }) {
	const { categories, addCategory } = useContext(AppContext);
	const { handleClick } = useContext(FileContext);
	const [newCategory, setNewCategory] = useState({ name: "", parent: "" });

	const handleAddCategory = () => {
		if (newCategory.name) {
			addCategory(newCategory);
			setNewCategory({ name: "", parent: "" });
			onUpdate([...categories, newCategory]); // Propagate changes to parent
		}
	};

	const handleInputChange = (name, value) => {
		setNewCategory((prev) => ({ ...prev, [name]: value }));
	};

	const categoryOptions = categories.map((category) => ({
		value: category.parent
			? `${category.parent}.${category.name}`
			: category.name,
		label: category.parent
			? `${category.parent}.${category.name}`
			: category.name,
	}));

	const handleImportClick = () => {
		handleClick((importedCategories) => {
			onUpdate(importedCategories);
		});
	};

	return (
		<div>
			<div className="input-header-row">
				<Title
					level="3"
					children="Participants Categories"
					className="tertiary-heading"
				/>
				<div className="header-buttons">
					<Button
						className="circle-button icon-button import"
						onClick={handleImportClick}
					>
						<ImportIcon className="import-icon icon" />
					</Button>
					<Button
						className="circle-button icon-button download"
						onClick={handleClick}
					>
						<DownloadIcon className="download-icon icon" />
					</Button>
				</div>
			</div>
			<div className="input-button-row">
				<TextInput
					placeholder="New Category"
					title="Category Name"
					name="name"
					value={newCategory.name}
					onChange={handleInputChange}
				/>
				<Dropdown
					name="parent"
					value={newCategory.parent}
					onChange={handleInputChange}
					options={categoryOptions}
					placeholder="select parent category"
				/>
				<Button
					className="circle-button"
					onClick={handleAddCategory}
					disabled={!newCategory.name}
				>
					+
				</Button>
			</div>
		</div>
	);
}

export default ParticipantCategoriesHeader;
