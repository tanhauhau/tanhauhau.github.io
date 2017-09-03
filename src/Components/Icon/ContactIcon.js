import React from 'react';
import './icon.css'

export default function ContactIcon ({ onClick, icon, active, hide }) {
  return (
    <div className={`Icon__div ${active ? 'Icon__div--active' : ''} ${hide ? 'Icon__div--hide' : ''}`} onClick={onClick}>
      <img className='Icon__img' src={ icon } alt='contact'/>
    </div>
  )
}
