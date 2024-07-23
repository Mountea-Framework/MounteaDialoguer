import React, { useRef } from "react";

import "../../componentStyles/objects/Button.css";

function Button({
  onClick,
  children,
  disabled,
  className,
  classState,
  containerClassName,
  buttonStyle
}) {
  const buttonRef = useRef(null);

  const handleClick = (e) => {
    if (buttonRef.current) {
      buttonRef.current.blur();
    }
    onClick(e);
  };

  return (
    <div
      className={`button-container ${
        containerClassName ? containerClassName : ""
      }`}
    >
      <button
        style={buttonStyle} // basically enhance with provided lines
        ref={buttonRef}
        className={`${classState ? classState : "primary"} ${
          className ? className : "custom-button"
        }`}
        onClick={handleClick}
        disabled={disabled}
      >
        {children}
      </button>
    </div>
  );
}

export default Button;
