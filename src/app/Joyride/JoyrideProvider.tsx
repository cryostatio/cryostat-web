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
import useSetState from '@app/utils/hooks/useSetState';
import * as React from 'react';
import { Step } from 'react-joyride';

export interface JoyrideState {
  run: boolean;
  stepIndex: number;
  steps: Step[];
}

const defaultState: JoyrideState = {
  run: false,
  stepIndex: 0,
  steps: [] as Step[],
};

export interface JoyrideContextType {
  state: JoyrideState;
  isNavBarOpen: boolean;
  setState: (patch: Partial<JoyrideState> | ((previousState: JoyrideState) => Partial<JoyrideState>)) => void;
  setIsNavBarOpen: (patch: boolean | ((prev: boolean) => boolean)) => void;
}

export const JoyrideContext = React.createContext<JoyrideContextType>({
  state: defaultState,
  setState: () => undefined,
  isNavBarOpen: true,
  setIsNavBarOpen: () => undefined,
});

export interface JoyrideProviderProps {
  children?: React.ReactNode;
}

export const JoyrideProvider: React.FC<JoyrideProviderProps> = ({ children, ...props }) => {
  const [state, setState] = useSetState(defaultState);
  const [isNavBarOpen, setIsNavBarOpen] = React.useState(true);

  const value = React.useMemo<JoyrideContextType>(
    () => ({ state, setState, isNavBarOpen, setIsNavBarOpen }),
    [state, setState, isNavBarOpen, setIsNavBarOpen],
  );
  return (
    <JoyrideContext.Provider value={value} {...props}>
      {children}
    </JoyrideContext.Provider>
  );
};

export const useJoyride = (): JoyrideContextType => {
  return React.useContext(JoyrideContext);
};
