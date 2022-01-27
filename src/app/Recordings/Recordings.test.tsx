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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Recordings } from './Recordings';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services'
import { of } from 'rxjs';

jest.mock('@patternfly/react-core/src/components/Card/Card', () => {
  return {
    Card: jest.fn().mockImplementation(() => {
      return <div>MockCard</div>
    })
  }
});

jest.mock('@patternfly/react-core', () => {
  return {
    Card: jest.fn().mockImplementation(({ children }) => {
      return <div>
                MockCard
                { children }
              </div>
    }),
    CardBody: jest.fn().mockImplementation(() => {
      return <div>MockCardBody</div>
    }),
    CardHeader: jest.fn().mockImplementation(() => {
      return <div>MockCardHeader</div>
    }),
    // Tab: jest.fn().mockImplementation(() => {

    // }),
    // Tabs: jest.fn().mockImplementation(() => {

    // }),
    Text: jest.fn().mockImplementation(() => {
      return <div>Active Recordings</div>
    }),
    // TextVariants: jest.fn().mockImplementation(() => {
      

    // }),
  }
}) 

jest.mock('@app/TargetView/TargetView', () => {
  return {
    TargetView: jest.fn().mockImplementation(({pageTitle, children}) => {
      return <div>
                {pageTitle}
                {children}
              </div>
    })
  }
});

describe('<Recordings />', () => {
  it('renders correctly', () => {
		jest.mock('@app/Shared/Services/Api.service', () => {
			return {
				ApiService: jest.fn().mockImplementation(() => {
					return {
						isArchiveEnabled: () => {of(true)}
					};
				})
			};
		});

    // render(
    //   <ServiceContext.Provider value = {defaultServices}>
		// 		<Recordings />
		// 	</ServiceContext.Provider>
		// );

    render (<Recordings />);

		expect(screen.getByTitle('Recordings')).toBeTruthy();
  })
});




