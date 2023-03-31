/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
