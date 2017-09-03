import React from 'react';
import me from './tan_li_hau.jpg';
import './me.css';

export default function Me ({ endState, onClick }) {
  return (
    <div className='Me__div' onClick={onClick}>
      <img className='Me__img' src={me} alt='Profile'/>
      <div className={`Me__innerDiv ${endState ? 'Me__innerDiv--active' : ''}`}>Tan Li Hau</div>
    </div>
  )
}
