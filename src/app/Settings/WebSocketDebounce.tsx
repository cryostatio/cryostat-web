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

import { ServiceContext } from '@app/Shared/Services/Services';
import { NumberInput } from '@patternfly/react-core';
import * as React from 'react';
import { SettingTab, UserSetting } from './SettingsUtils';

const defaultPreferences = {
  webSocketDebounceMs: 100,
};

const debounceMin = 1;
const debounceMax = 1000;

const Component = () => {
  const context = React.useContext(ServiceContext);
  const [state, setState] = React.useState(defaultPreferences);

  React.useLayoutEffect(() => {
    setState({
      webSocketDebounceMs: context.settings.webSocketDebounceMs(),
    });
  }, [setState, context.settings]);

  const handleWebSocketDebounceMinus = React.useCallback(() => {
    setState((state) => {
      const newState = { ...state };
      let debounce = (state.webSocketDebounceMs || 1) - 1;
      if (debounce < debounceMin) {
        debounce = debounceMin;
      }
      newState.webSocketDebounceMs = debounce;
      context.settings.setWebSocketDebounceMs(newState.webSocketDebounceMs);
      return newState;
    });
  }, [setState, context.settings]);

  const handleWebSocketDebouncePlus = React.useCallback(() => {
    setState((state) => {
      const newState = { ...state };
      let debounce = (state.webSocketDebounceMs || 1) + 1;
      if (debounce > debounceMax) {
        debounce = debounceMax;
      }
      newState.webSocketDebounceMs = debounce;
      context.settings.setWebSocketDebounceMs(newState.webSocketDebounceMs);
      return newState;
    });
  }, [setState, context.settings]);

  const handleWebSocketDebounceChange = React.useCallback(
    (event) => {
      setState((state) => {
        let next = isNaN(event.target.value) ? state.webSocketDebounceMs : Number(event.target.value);
        if (state.webSocketDebounceMs < debounceMin) {
          next = debounceMin;
        } else if (state.webSocketDebounceMs > debounceMax) {
          next = debounceMax;
        }
        context.settings.setWebSocketDebounceMs(next);
        return { ...state, webSocketDebounceMs: next };
      });
    },
    [setState, context.settings]
  );

  return (
    <>
      <NumberInput
        value={state.webSocketDebounceMs}
        min={debounceMin}
        max={debounceMax}
        onChange={handleWebSocketDebounceChange}
        onMinus={handleWebSocketDebounceMinus}
        onPlus={handleWebSocketDebouncePlus}
        unit="ms"
      />
    </>
  );
};

export const WebSocketDebounce: UserSetting = {
  titleKey: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.TITLE',
  descConstruct: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.DESCRIPTION',
  content: Component,
  category: SettingTab.CONNECTIVITY,
};
