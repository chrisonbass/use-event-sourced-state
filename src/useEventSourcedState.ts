import produce from "immer";
import { useCallback, useMemo, useState } from "react";

type ReducerFunction = (...args: any[]) => (obj: any) => void;

type ReducerMapper = {
  [key: string]: ReducerFunction
}

type EventSource = {
  reducerName: string,
  args: [any]
}

interface UseEventSourceProps<Type> {
  initialState: Type,
  reducerMapper: ReducerMapper,
  sourceEventIndex?: number,
  eventList?: Array<EventSource>
}

interface UseEventSourceState<Type> {
  initialState: Type,
  liveState: Type, 
  reducerMapper: ReducerMapper,
  sourceEventIndex: number,
  eventList: Array<EventSource>
}

type MappedReducerActions = {
  [key: string]: (...args: any[]) => void
}

type OptionalFunction = undefined | (() => void);

type EventSourceMeta = {
  undo: OptionalFunction,
  redo: OptionalFunction,
  replay: ((sourceEventIndex: number) => void),
  sourceEventIndex: number,
  eventList: Array<EventSource>
}

type UseEventSourceReturn<Type> = [
  Type,
  MappedReducerActions,
  EventSourceMeta
]

export default function useEventSourcedState<Type>(props: UseEventSourceProps<Type>): UseEventSourceReturn<Type> {
  const [state, setState] = useState<UseEventSourceState<Type>>({
    initialState: props.initialState,
    liveState: {...props.initialState},
    reducerMapper: props.reducerMapper,
    sourceEventIndex: props.sourceEventIndex ? props.sourceEventIndex : props.eventList ? props.eventList.length - 1 : -1,
    eventList: props.eventList || []
  });
  const {liveState, reducerMapper, sourceEventIndex, eventList} = state;

  const replay = useCallback((eventIndex: number) => {
    setState(({initialState, eventList, ...currentState}) => {
      return {
        ...currentState,
        initialState,
        eventList,
        sourceEventIndex: eventIndex,
        liveState: produce(initialState, (draft: any) => {
          let i = 0;
          for (i = 0; i <= eventIndex; i++) {
            if (i >= eventList.length) {
              break;
            }
            const {reducerName, args} = eventList[i];
            reducerMapper[reducerName](...args)(draft);
          }
        })
      }
    });
  }, [reducerMapper]);

  const [undo, redo] = useMemo<[OptionalFunction, OptionalFunction]>((): [OptionalFunction, OptionalFunction] => {
    const undo = sourceEventIndex >= 0 ? () => {
      replay(sourceEventIndex - 1);
    } : undefined;
    const redo = sourceEventIndex < eventList.length - 1 ? () => {
      replay(sourceEventIndex + 1);
    } : undefined;
    return [undo, redo];
  }, [sourceEventIndex, eventList, replay])

  const buildApplyReducerFunction = useCallback((reducerName: string): ((...args: [any]) => void) => {
    return (...args: [any]) => {
      setState(({liveState, reducerMapper, sourceEventIndex, eventList, ...currentState}) => {
        const updateEventList = [
          ...eventList.slice().splice(0, sourceEventIndex + 1),
          { reducerName, args }
        ];
        return {
          ...currentState,
          reducerMapper,
          liveState: produce(liveState, (draft: any) => {
            reducerMapper[reducerName](...args)(draft);
          }),
          sourceEventIndex: updateEventList.length - 1,
          eventList: updateEventList
        }
      });
    }
  }, []);

  const mappedReducerActions: MappedReducerActions = useMemo(() => {
    let actions: MappedReducerActions = {};
    Object.keys(reducerMapper).forEach((reducerName: string) => {
      actions[reducerName] = buildApplyReducerFunction(reducerName);
    });
    return actions;
  }, [reducerMapper, buildApplyReducerFunction]);

  return [
    liveState,
    mappedReducerActions,
    {
      undo,
      redo,
      replay,
      sourceEventIndex,
      eventList
    }
  ];
}