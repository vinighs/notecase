import React from 'react';
import classnames from 'classnames';

const Button = ({ children, onClick, variant = 'primary', className, ...props }) => {
  // Combina as classes do componente com quaisquer classes extras passadas via props
  const buttonClasses = classnames(
    'button',
    `button-${variant}`,
    className,
  );
  return (
    <button className={buttonClasses} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

export default Button;