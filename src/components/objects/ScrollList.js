import React, { useCallback } from "react";

import ScrollListItem from "./ScrollListItem";

import "../../componentStyles/objects/ScrollList.css";

function ScrollList({
	items = [],
	onSelect,
	onIconClick,
	className,
	classState,
	classNameItems,
	classStateItems,
	EditComponent,
	allowEdit = true,
	allowDelete = true,
	allowSelection,
	selectedItem,
	onSelectItem,
}) {
	const handleSelect = useCallback(
		(item) => {
			if (onSelectItem) {
				onSelectItem(item);
			}
			onSelect(item);
		},
		[onSelect, onSelectItem]
	);

	return (
		<div
			className={`${classState ? classState : "primary"} ${
				className ? className : "scroll-list"
			}`}
		>
			<ul>
				{items.map((item, index) => {
					const isItemSelected = selectedItem?.value === item?.value;

					return (
						<ScrollListItem
							key={index}
							item={item}
							onSelect={handleSelect}
							onIconClick={onIconClick}
							className={`${classNameItems ? classNameItems : ""}`}
							classState={`${classStateItems ? classStateItems : ""}`}
							isSelected={isItemSelected}
							EditComponent={EditComponent}
							allowDelete={allowDelete}
							allowEdit={allowEdit}
							allowSelection={allowSelection}
						/>
					);
				})}
			</ul>
		</div>
	);
}

export default ScrollList;
