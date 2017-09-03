import React from 'react';
import PropTypes from 'prop-types'

class HistoryProvider extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      gotoURL: this.goto.bind(this),
      location: this.getLocation()
    }
  }

  componentDidMount () {
    window.onpopstate = () => {
      this.setState({ location: this.getLocation() })
    }
  }

  goto (location) {
    window.history.pushState({}, '', location)
    this.setState({ location: this.getLocation() })
  }

  getLocation () {
    return window.location.hash.replace('#', '')
  }

  getChildContext() {
    return this.state;
  }

  render () {
    return this.props.children;
  }

}
HistoryProvider.childContextTypes = {
  gotoURL: PropTypes.func,
  location: PropTypes.string,
}
export default HistoryProvider;
