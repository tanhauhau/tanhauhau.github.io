import React from 'react';
import PropTypes from 'prop-types'
import resizeListener from './resizeListener';

class ResizeProvider extends React.Component {
  constructor (props) {
    super(props);
    this.updateSize(false);
  }

  componentDidMount () {
    this.updateSize();

    resizeListener(() => {
      this.updateSize();
    })
  }

  updateSize (update = true) {
    const { innerWidth, innerHeight } = window;
    if (update) {
      this.setState({ innerWidth, innerHeight });
    } else {
      this.state = { innerWidth, innerHeight };
    }
  }

  getChildContext() {
    return this.state;
  }

  render () {
    return this.props.children;
  }

}
ResizeProvider.childContextTypes = {
  innerHeight: PropTypes.number,
  innerWidth: PropTypes.number,
}
export default ResizeProvider;
