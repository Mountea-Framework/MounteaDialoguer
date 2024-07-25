import React, { useState } from "react";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";
import { ReactComponent as EditIcon } from "../../icons/editoIcon.svg";

import "../../componentStyles/objects/ScrollListItem.css";

function ScrollListItem({
	item,
	onIconClick,
	className,
	classState,
	onEdit,
	EditComponent, // Accept EditComponent as a prop
}) {
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);

	const handleEditClick = () => {
		setSelectedItem(item);
		setIsEditOpen(true);
	};

	const handleSave = (editedItem, originalItem) => {
		onEdit(editedItem, originalItem);
		setIsEditOpen(false);
	};

	return (
		<>
			<li
				className={`${classState ? classState : "primary"} ${
					className ? className : "scroll-list-item"
				}`}
				onClick={handleEditClick}
			>
				<span className="item-text">
					{item.displayName || item.name || item}
				</span>
				<span className="item-icon edit-icon" onClick={handleEditClick}>
					<EditIcon />
				</span>
				<span
					className={`item-icon remove-icon ${
						classState ? classState : "primary"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						onIconClick(item);
					}}
				>
					<RemoveIcon />
				</span>
			</li>
			{isEditOpen && selectedItem && (
				<EditComponent
					isOpen={isEditOpen}
					onClose={() => setIsEditOpen(false)}
					item={selectedItem}
					onSave={handleSave}
				/>
			)}
		</>
	);
}

export default ScrollListItem;
