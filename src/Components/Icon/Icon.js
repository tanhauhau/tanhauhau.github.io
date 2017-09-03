import React from 'react';
import './icon.css'

export default function Icon ({ onClick, icon, name, endState, active, index }) {
  return (
    <div className={`Icon__div ${active ? 'Icon__div--active' : ''}`} onClick={onClick}>
      <img className='Icon__img' src={ icon } alt={name}/>
      <div
        className={`Icon__innerDiv ${endState ? `Icon__innerDiv--active Icon__innerDiv--active_${index}` : ''}`}>
        { name }
      </div>
    </div>
  )
}
