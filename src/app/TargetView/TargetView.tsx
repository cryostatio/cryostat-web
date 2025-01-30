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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { BreadcrumbTrail } from '@app/BreadcrumbPage/types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NoTargetSelected } from '@app/TargetView/NoTargetSelected';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import * as React from 'react';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { TargetContextSelector } from './TargetContextSelector';

interface TargetViewProps {
  attachments?: React.ReactNode;
  pageTitle: string;
  breadcrumbs?: BreadcrumbTrail[];
  children: React.ReactNode;
}

export const TargetView: React.FC<TargetViewProps> = ({ attachments, pageTitle, breadcrumbs, children }) => {
  const context = React.useContext(ServiceContext);
  const [hasSelection, setHasSelection] = React.useState(false);
  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    addSubscription(
      context.target
        .target()
        .pipe(
          map((target) => !!target),
          distinctUntilChanged(),
        )
        .subscribe(setHasSelection),
    );
  }, [context.target, addSubscription, setHasSelection]);

  return (
    <>
      <TargetContextSelector />
      {attachments}
      <BreadcrumbPage pageTitle={pageTitle} breadcrumbs={breadcrumbs}>
        {hasSelection ? children : <NoTargetSelected />}
      </BreadcrumbPage>
    </>
  );
};
