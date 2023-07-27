/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import useSetState from '@app/utils/useSetState';
import React from 'react';
import { Step } from 'react-joyride';

export interface JoyrideState {
  run: boolean;
  stepIndex: number;
  steps: Step[];
}

const defaultState = {
  run: false,
  stepIndex: 0,
  steps: [] as Step[],
};

export interface JoyrideContextType {
  state: JoyrideState;
  setState: (patch: Partial<JoyrideState> | ((previousState: JoyrideState) => Partial<JoyrideState>)) => void;
  isNavBarOpen: boolean;
  setIsNavBarOpen: (isOpen: React.SetStateAction<boolean>) => void;
}

/* eslint-disable @typescript-eslint/no-empty-function */
export const JoyrideContext = React.createContext<JoyrideContextType>({
  state: defaultState,
  setState: () => undefined,
  isNavBarOpen: true,
  setIsNavBarOpen: () => undefined,
});
/* eslint-enable @typescript-eslint/no-empty-function */

export const JoyrideProvider: React.FC<{ children }> = (props) => {
  const [state, setState] = useSetState(defaultState);
  const [isNavBarOpen, setIsNavBarOpen] = React.useState(true);
  const value = React.useMemo(
    () => ({ state, setState, isNavBarOpen, setIsNavBarOpen }),
    [state, setState, isNavBarOpen, setIsNavBarOpen]
  );
  return (
    <JoyrideContext.Provider value={value} {...props}>
      {props.children}
    </JoyrideContext.Provider>
  );
};

export const useJoyride = (): JoyrideContextType => {
  return React.useContext(JoyrideContext);
};
