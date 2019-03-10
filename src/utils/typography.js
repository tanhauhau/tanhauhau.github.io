import Typography from 'typography';
import Lincoln from 'typography-theme-lincoln';
import './theme-prisms-dracula.css'

const PRIMARY_COLOR = '#612e77';

Lincoln.overrideThemeStyles = () => {
  return {
    body: {
      backgroundColor: '#faf0fd',
    },
    'a.gatsby-resp-image-link': {
      boxShadow: `none`,
    },
    a: {
      color: PRIMARY_COLOR,
      textDecoration: 'underline',
      textDecorationStyle: 'dotted',
      fontWeight: 400,
      textShadow: 'initial',
      backgroundImage: 'initial',
    },
    pre: {
      overflow: 'scroll',
    },
    blockquote: {
      borderLeftColor: PRIMARY_COLOR,
    }
  };
};

const typography = new Typography(Lincoln);

// Hot reload typography in development.
if (process.env.NODE_ENV !== `production`) {
  typography.injectStyles();
}

export default typography;
export const rhythm = typography.rhythm;
export const scale = typography.scale;
