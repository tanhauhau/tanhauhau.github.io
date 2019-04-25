// custom typefaces
import 'typeface-varela-round';
import 'typeface-lora';

import React from 'react';
import DarkModeSwitch from './src/components/components/DarkModeSwitch';

export const wrapRootElement = ({ element }) => {
  return (
    <>
      {element}
      <DarkModeSwitch />
    </>
  );
};
