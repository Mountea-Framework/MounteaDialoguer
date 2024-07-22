import React from "react";
import ReactDOM from "react-dom";
import Title from "./Title";

import "../../componentStyles/objects/Modal.css";


const Modal = ({ title, children, onClose }) => {
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <Title
          level="3"
          children={title}
          className="tertiary-heading"
        />
        {children}
      </div>
    </div>,
    document.getElementById("modal-root")
  );
};

export default Modal;
