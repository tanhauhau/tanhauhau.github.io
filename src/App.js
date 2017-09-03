import React from 'react';
import Main from './Components/Main/Main';
import ResizeProvider from './Components/ResizeProvider/ResizeProvider';
import HistoryProvider from './Components/HistoryProvider/HistoryProvider';

import './App.css';

class App extends React.Component {
  render() {

    return (
      <HistoryProvider>
        <ResizeProvider>
          <Main />
        </ResizeProvider>
      </HistoryProvider>
    );
  }
}

export default App;


/*
<div>Icons made by <a href="https://www.flaticon.com/authors/smashicons" title="Smashicons">Smashicons</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
<div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
*/
