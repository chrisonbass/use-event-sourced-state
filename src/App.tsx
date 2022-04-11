import useEventSourcedState from './useEventSourcedState';
import './App.css';
import { useCallback, useMemo } from 'react';

type AppState = {
  name: string,
  age: number,
  agree: boolean
}

const reducerMapper = {
  updateName: (name: string) => (draft: AppState) => {
    draft.name = name;
  },
  updateAge: (age: number) => (draft: AppState) => {
    draft.age = age;
  },
  toggleAgree: () => (draft: AppState) => {
    draft.agree = !draft.agree;
  }
};

function App() {
  const [
    {name, age, agree},
    { updateName, updateAge, toggleAgree },
    {
      undo,
      redo,
      replay,
      sourceEventIndex,
      eventList
    }   
  ] = useEventSourcedState<AppState>({
    initialState: {
      name: '',
      age: 18,
      agree: false
    },
    reducerMapper
  });

  const handleUpdateName = useCallback((e) => {
    updateName(e.target.value);
  }, [updateName]);

  const handleUpdateAge = useCallback((e) => {
    let age = e.target.value;
    if (age.length) {
      age = parseInt(age, 10);
    }
    updateAge(age);
  }, []);

  const handleToggle = useCallback(() => {
    toggleAgree();
  }, [toggleAgree]);

  const handleRestore = useCallback((e) => {
    const eventIndex = parseInt(e.target.getAttribute('data-event-index'), 10);
    replay(eventIndex);
  }, [replay]);

  const eventHistory = useMemo(() => {
    return eventList.map(({reducerName, args}, index) => {
      const label = `${reducerName}(${args.length ? JSON.stringify(args) : ''})`;
      return (
        <li key={`event-source-${index}`}>
          {index === sourceEventIndex ? (
            <strong>{label}</strong>
          ) : label}
          <button data-event-index={index} onClick={handleRestore}>Restore</button> 
        </li>
      );
    });
  }, [eventList, sourceEventIndex]);

  return (
    <div className="App">
      <h1>Event Sourced State</h1>
      <p>Modify form below</p>
      <div className='columns'>
        <div>
          <label htmlFor='name'>Name</label><br />
          <input id='name' type='text' value={name} onChange={handleUpdateName} />
        </div>
        <div>
          <label htmlFor='name'>Age</label><br />
          <input id='age' type='number' value={age} onChange={handleUpdateAge} />
        </div>
      </div>
      <div>
        <label>
          Agree? <input type='checkbox' checked={agree} onChange={handleToggle} />
        </label>
      </div>
      <div>
        <h2>Event History</h2>
        <div className='column'>
          <button disabled={undo === undefined} onClick={undo}>undo</button>
          <button disabled={redo === undefined} onClick={redo}>redo</button>
        </div>
        <ul>
          <li>
            {sourceEventIndex === -1 ? (<strong>Initial State</strong>) : 'Initial State'}
            <button data-event-index='-1' disabled={sourceEventIndex === -1} onClick={handleRestore}>Restore</button> 
          </li>
          {eventHistory}
        </ul>
      </div>
    </div>
  );
}

export default App;
