import React from 'react';
import './moveAround.css';

export default class MoveAround extends React.Component {
  render () {
    const { children, to, from, moved } = this.props;
    const style = moved ? to : from;
    return (
      <div className='MoveAround' style={style}>
        { React.cloneElement(
            React.Children.only(children),
            { endState: moved }
          )
        }
      </div>
    )
  }
}
