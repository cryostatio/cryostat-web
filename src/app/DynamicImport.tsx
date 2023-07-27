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
import { accessibleRouteChangeHandler } from '@app/utils/utils';
import * as React from 'react';

interface IDynamicImport {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  load: () => Promise<any>;
  children: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  focusContentAfterMount: boolean;
}

class DynamicImport extends React.Component<IDynamicImport> {
  public state = {
    component: null,
  };
  private routeFocusTimer: number;
  constructor(props: IDynamicImport) {
    super(props);
    this.routeFocusTimer = 0;
  }
  public componentWillUnmount() {
    window.clearTimeout(this.routeFocusTimer);
  }
  public componentDidMount() {
    this.props
      .load()
      .then((component) => {
        if (component) {
          this.setState({
            component: component.default ? component.default : component,
          });
        }
      })
      .then(() => {
        if (this.props.focusContentAfterMount) {
          this.routeFocusTimer = accessibleRouteChangeHandler();
        }
      });
  }
  public render() {
    return this.props.children(this.state.component);
  }
}

export { DynamicImport };
