import React from "react";
import PropTypes from "prop-types";

function Title({ level, children, className, classState }) {
  const Heading = `h${Number(level)}`;
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
  level: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  children: PropTypes.node.isRequired,
};

Title.defaultProps = {
  level: 1,
};

export default Title;
