import React, { useState } from "react";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";
import { ReactComponent as EditIcon } from "../../icons/editoIcon.svg";

import "../../componentStyles/objects/ScrollListItem.css";

function ScrollListItem({
	item,
	onSelect,
	onIconClick,
	className,
	classState,
	onEdit,
	EditComponent,
	allowEdit = true,
	allowDelete = true,
	allowClick = true,
}) {
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);

	const handleEditClick = () => {
		setSelectedItem(item);
		setIsEditOpen(true);
	};

	const handleItemClick = () => {
		setSelectedItem(item);
		onSelect(item);
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
				onClick={allowClick ? handleItemClick : undefined}
			>
				<span className="item-text">
					{item.displayName || item.name || item}
				</span>
				{allowEdit && (
					<span className="item-icon edit-icon" onClick={handleEditClick}>
						<EditIcon />
					</span>
				)}
				{allowDelete && (
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
				)}
			</li>
			{allowEdit && isEditOpen && selectedItem && (
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
