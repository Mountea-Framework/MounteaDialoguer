import React from "react";

import PropTypes from "prop-types";

function Title({ level, children, className, classState }) {
  const Heading = `h${level}`;
  return (
    <Heading
      className={`${classState ? classState : "primary"} ${
        className ? className : "primary-heading"
      }`}
    >
      {children}
    </Heading>
  );
}

Title.propTypes = {
  level: PropTypes.number,
  children: PropTypes.node.isRequired,
};

Title.defaultProps = {
  level: 1,
};

export default Title;
