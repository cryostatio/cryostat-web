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

import { LoadingView } from '@app/Shared/Components/LoadingView';
import { cleanup, render, screen } from '@testing-library/react';
import renderer, { act } from 'react-test-renderer';

describe('<LoadingView />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<LoadingView />);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should show spinner and title', async () => {
    render(<LoadingView title="Progressing" />);

    const title = screen.getByText('Progressing');
    expect(title).toBeInTheDocument();
    expect(title).toBeVisible();

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toBeVisible();
  });
});
