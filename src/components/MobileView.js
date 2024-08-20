import React from "react";

import Title from "./objects/Title";

import "../componentStyles/MobileView.css";

function MobileView() {

    console.log("Mobile View");
    
	return (
		<div className="mobile-view">
			<Title
				level="1"
				children="Mobile Devices Support currently WIP"
				className="primary-heading"
				maxLength={64}
			/>
		</div>
	);
}

export default MobileView;
