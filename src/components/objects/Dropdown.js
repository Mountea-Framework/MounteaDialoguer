import React from "react";

import "../../componentStyles/objects/Dropdown.css";

function Dropdown({ name, value, onChange, options, placeholder, className, classState }) {
  return (
    <div className="dropdown-container">
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className ={`${classState ? classState : 'primary'} ${className ? className : "dropdown"}`}
      >
        <option value="" >
          {placeholder}
        </option>
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Dropdown;
