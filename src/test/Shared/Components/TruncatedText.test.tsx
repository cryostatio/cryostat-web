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

import { TruncatedText } from '@app/Shared/Components/TruncatedText';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

describe('<TruncatedText />', () => {
  it('should render short text without truncation', () => {
    const shortText = 'Short text';
    render(<TruncatedText text={shortText} maxLength={100} />);

    expect(screen.getByText(shortText)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should truncate long text and show "Show more" button', () => {
    const longText =
      'This is a very long text that should be truncated because it exceeds the maximum length specified in the component props';
    render(<TruncatedText text={longText} maxLength={50} />);

    expect(screen.getByText(/This is a very long text that should be truncated/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('should expand text when "Show more" is clicked', async () => {
    const user = userEvent.setup();
    const longText =
      'This is a very long text that should be truncated because it exceeds the maximum length specified in the component props';
    render(<TruncatedText text={longText} maxLength={50} />);

    const showMoreButton = screen.getByRole('button', { name: 'Show more' });
    await user.click(showMoreButton);

    expect(screen.getByText(longText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('should collapse text when "Show less" is clicked', async () => {
    const user = userEvent.setup();
    const longText =
      'This is a very long text that should be truncated because it exceeds the maximum length specified in the component props';
    render(<TruncatedText text={longText} maxLength={50} />);

    const showMoreButton = screen.getByRole('button', { name: 'Show more' });
    await user.click(showMoreButton);

    const showLessButton = screen.getByRole('button', { name: 'Show less' });
    await user.click(showLessButton);

    expect(screen.getByText(/This is a very long text that should be truncated/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('should use default maxLength of 100 when not specified', () => {
    const text = 'a'.repeat(150);
    render(<TruncatedText text={text} />);

    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('should not truncate text exactly at maxLength', () => {
    const text = 'a'.repeat(100);
    render(<TruncatedText text={text} maxLength={100} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// Made with Bob
