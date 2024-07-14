import React from "react";

import PropTypes from "prop-types";

function Title({ level, children }) {
  const Heading = `h${level}`;
  return <Heading>{children}</Heading>;
}

Title.propTypes = {
  level: PropTypes.number,
  children: PropTypes.node.isRequired,
};

Title.defaultProps = {
  level: 1,
};

export default Title;
