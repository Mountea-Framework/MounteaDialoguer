import React from "react";

import Title from "./objects/Title";
import Button from "./objects/Button";

import { ReactComponent as DiscordIcon } from "../icons/discordIcon.svg";
import { ReactComponent as FavoriteIcon } from "../icons/favoriteIcon.svg";

import "../componentStyles/MobileView.css";

function MobileView() {
	console.log("Mobile View");

	return (
		<div className="mobile-view">
			<Title
				level="1"
				children="Mobile Devices Support In Progress"
				className="primary-heading"
				maxLength={64}
			/>
			<div className="buttons">
				<Button
					abbrTitle={"Open support Discord"}
					containerClassName={"toolbar-button-container"}
					className={"custom-button toolbar-button"}
					classState={"tertiary"}
					onClick={() => window.open("https://discord.gg/waYT2cn37z", "_blank")}
				>
					<DiscordIcon className="icon" />
				</Button>
				<Button
					abbrTitle={"Support our work"}
					containerClassName={"toolbar-button-container"}
					className={"custom-button toolbar-button"}
					classState={"tertiary"}
					onClick={() =>
						window.open(
							"https://github.com/sponsors/Mountea-Framework",
							"_blank"
						)
					}
				>
					<FavoriteIcon className="favorite-icon icon" />
				</Button>
			</div>
		</div>
	);
}

export default MobileView;
