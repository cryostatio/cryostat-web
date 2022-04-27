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
import { Link } from 'react-router-dom';
import { NotFoundCard } from './NotFoundCard';
import { 
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateSecondaryActions,
  Title
} from '@patternfly/react-core';
import '@app/app.css'
import { MapMarkedAltIcon } from '@patternfly/react-icons';

const NotFound: React.FunctionComponent = () => (
  <EmptyState className='pf-c-empty-state-not-found'>
    <EmptyStateIcon icon={MapMarkedAltIcon} />
    <Title headingLevel="h4" size="lg" >
      404: We couldn't find that page
    </Title>
    <EmptyStateBody>
      One of the following pages might have what you're looking for.
    </EmptyStateBody>
    <EmptyStateSecondaryActions>
      <NotFoundCard
        title='About'
        bodyText='Get information, help, or support for Cryostat.'
        linkText='View about'
        linkPath='/about'
      />
      <NotFoundCard
        title='Automated Rules'
        bodyText='Create recordings on multiple target JVMs at once using Automated Rules consisting of a name, match expression, template, archival period, and more.'
        linkText='View automated rules'
        linkPath='/rules'
      />
      <NotFoundCard
        title='Recordings'
        bodyText='Create, view and archive JFR recordings on single target JVMs.'
        linkText='View recordings'
        linkPath='/recordings'
      />
      <NotFoundCard
        title='Archives'
        bodyText='View archived recordings across all target JVMs, as well as upload recordings directly to the archive.'
        linkText='View archives'
        linkPath='/archives'
      />
      <NotFoundCard
        title='Events'
        bodyText='View available JFR event templates and types for target JVMs, as well as upload custom templates.'
        linkText='View events'
        linkPath='/events'
      />
      <NotFoundCard
        title='Security'
        bodyText='Upload SSL certificates for Cryostat to trust when communicating with target applications.'
        linkText='View security'
        linkPath='/security'
      />
    </EmptyStateSecondaryActions>
    <Button variant="primary" component={props => <Link {...props} to="/"/>}>Take me home</Button>
  </EmptyState>
)

export { NotFound };
