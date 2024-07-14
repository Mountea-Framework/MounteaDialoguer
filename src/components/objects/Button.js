import React from "react";

import "../../componentStyles/objects/Button.css";

function Button({ onClick, children, disabled, className, style }) {
  const buttonStyle = {
    margin: "20px 0",
    ...style,
  };

  return (
    <div className={`button-container ${className || ""}`}>
      <button
        className={`${className ? className : "custom-button"}`}
        onClick={onClick}
        disabled={disabled}
        style={buttonStyle}
      >
        {children}
      </button>
    </div>
  );
}

export default Button;
