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
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import { ServiceContext } from '@app/Shared/Services/Services';
import {
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DownloadIcon, UploadIcon } from '@patternfly/react-icons';
import React from 'react';
import { DashboardLayoutUploadModal } from './DashboardLayoutUploadModal';

export interface DashboardLayoutConfigProps {
  children?: React.ReactNode;
}

export const DashboardLayoutConfig: React.FunctionComponent<DashboardLayoutConfigProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const handleUploadRule = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setIsModalOpen(true);
    },
    [setIsModalOpen]
  );

  const handleDownloadRule = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setDownloading(true);
      setTimeout(() => {
        context.api.downloadDashboardLayout();
        setDownloading(false);
      }, 2000);
    },
    [setDownloading]
  );

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Downloading dashboard layouts',
        spinnerAriaLabel: 'downloading-dashboard-layouts',
        isLoading: downloading,
      } as LoadingPropsType),
    [downloading]
  );

  return (
    <Toolbar isSticky>
      <ToolbarContent>
        <ToolbarGroup>
          <ToolbarItem>
            <Button
              key="upload"
              variant="secondary"
              aria-label="Upload"
              onClick={handleUploadRule}
              icon={<UploadIcon />}
            >
              Upload layout
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button
              key="download"
              variant="secondary"
              aria-label="Download layout"
              onClick={handleDownloadRule}
              icon={<DownloadIcon />}
              {...submitButtonLoadingProps}
            >
              Download layout
            </Button>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
      <DashboardLayoutUploadModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Toolbar>
  );
};
