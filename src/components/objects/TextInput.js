import React from "react";

import "../../componentStyles/objects/TextInput.css";

function TextInput({ placeholder, value, onChange, name, highlight, onClick, readOnly }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="text-input-container">
     <input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={highlight ? 'highlight' : ''}
          onClick={onClick}
          readOnly={readOnly}
        />
    </div>
  );
}

export default TextInput;
