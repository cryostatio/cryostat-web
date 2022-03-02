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
import * as React from 'react';
import renderer from 'react-test-renderer'
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { Tabs } from '@patternfly/react-core';
import { ServiceContext, defaultServices } from '../../app/Shared/Services/Services'
import { Recordings } from '../../app/Recordings/Recordings';

jest.mock('@patternfly/react-core', () => {
  const defaultTabsMock = ({activeKey, onSelect, children}) => {
    return <div>
              Tabs
              {children}
           </div>
  };
  
  const alternateTabsMock = ({activeKey, onSelect, children}) => {
    return <div>
              Tabs
              <button 
                onClick={(evt) => {
                  onSelect(evt, 1)
                }}
              >
              Simulate Tab Selection
              </button> 
              {children}
           </div>
  };

  return {
    Card: jest.fn().mockImplementation(({children}) => {
      return <div>
                Card
                {children}
             </div>
    }),
    CardBody: jest.fn().mockImplementation(({children}) => {
      return <div>
                CardBody
                {children}
             </div>
    }),
    CardHeader: jest.fn().mockImplementation(({children}) => {
      return <div>
                CardHeader
                {children}
             </div>
    }),
    Tabs: jest.fn().mockImplementationOnce(defaultTabsMock)
                   .mockImplementationOnce(alternateTabsMock)
                   .mockImplementation(defaultTabsMock),
    Tab: jest.fn().mockImplementation(({eventKey, title, children}) => {
      return <div>
                Tab
                <div> 
                  {title}
                </div>
                {children}             
             </div>
    }),
    Text: jest.fn().mockImplementation(({component, children}) => {
      return <div>
                <div> 
                  Text
                </div>
                {children}   
             </div>
    })
  }
}) 

jest.mock('@app/Recordings/ActiveRecordingsTable', () => {
  return {
    ActiveRecordingsTable: jest.fn().mockImplementation(({archiveEnabled, onArchive}) => {
      return <div>
                Table
             </div>
    })
  }
});

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => {
  return {
    ArchivedRecordingsTable: jest.fn().mockImplementation(() => {
      return <div>
                Table
             </div>
    })
  }
});

jest.mock('@app/TargetView/TargetView', () => {
  return {
    TargetView: jest.fn().mockImplementation(({pageTitle, children}) => {
      return <div>
                TargetView
                <div>
                  {pageTitle}
                </div>
                {children}
             </div>
    })
  }
});

jest.mock('@app/Shared/Services/Api.service', () => {
  return {
    ApiService: jest.fn().mockImplementation(() => {
      return {
        isArchiveEnabled: jest.fn()
                          .mockReturnValueOnce(of(true))
                          .mockReturnValueOnce(of(false))
                          .mockReturnValue(of(true))
      };
    })
  };
});

beforeEach(() => {
  jest.clearAllMocks();
})

describe('<Recordings />', () => {
  it('renders correctly', () => {
    const tree = renderer
      .create(
        <ServiceContext.Provider value = {defaultServices}>
          <Recordings />
        </ServiceContext.Provider>)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('handles the case where archiving is enabled', () => {
    render(
      <ServiceContext.Provider value = {defaultServices}>
				<Recordings />
			</ServiceContext.Provider>
		);

    expect(screen.getByText("Active Recordings")).toBeInTheDocument()
		expect(screen.getByText("Archived Recordings")).toBeInTheDocument()
  });

  it('handles the case where archiving is disabled', () => {
    render(
      <ServiceContext.Provider value = {defaultServices}>
				<Recordings />
			</ServiceContext.Provider>
		);

		expect(screen.getByText("Active Recordings")).toBeInTheDocument()
    expect(screen.queryByText("Archived Recordings")).not.toBeInTheDocument();
  });

  it('handles updating the activeTab state', () => {
    render(
      <ServiceContext.Provider value = {defaultServices}>
				<Recordings />
			</ServiceContext.Provider>
		);

    const alternateTabsMock = Tabs as unknown as jest.Mock;
    expect(alternateTabsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeKey: 0,
      }),
      expect.anything()
    );

    userEvent.click(screen.getByText('Simulate Tab Selection'));

    const defaultTabsMock = Tabs as unknown as jest.Mock;
    expect(defaultTabsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeKey: 1,
      }),
      expect.anything()
    );
  })
});
