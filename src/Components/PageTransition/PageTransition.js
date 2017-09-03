import React from 'react';
import Transition from 'react-transition-group/Transition';
import './transition.css'

export default class PageTransition extends React.Component {
  render () {
    const { show, page: Page } = this.props;
    return (
      <Transition in={show} timeout={{ enter: 1, exit: 200 }}>
        {state => <Page className={`Page--transition Page--transition${state}`}/>}
      </Transition>
    )
  }
}
