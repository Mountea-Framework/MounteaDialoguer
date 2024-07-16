import React from "react";

import "../../componentStyles/objects/Button.css";

function Button({ onClick, children, disabled, className, classState, containerClassName }) {

  return (
    <div className={`button-container ${containerClassName ? containerClassName : ""}`}>
      <button
        className={`${classState ? classState : "primary"} ${className ? className : "custom-button"}`}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    </div>
  );
}

export default Button;
