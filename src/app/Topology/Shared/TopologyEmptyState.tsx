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
import { topologyDeleteAllFiltersIntent } from '@app/Shared/Redux/ReduxStore';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  EmptyStateVariant,
  Title,
} from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { DiscoveryTreeContext, getAllLeaves, SearchExprServiceContext } from './utils';

export interface TopologyEmptyStateProps {}

export const TopologyEmptyState: React.FC<TopologyEmptyStateProps> = ({ ...props }) => {
  const discoveryTree = React.useContext(DiscoveryTreeContext);
  const dispatch = useDispatch();
  const searchExprService = React.useContext(SearchExprServiceContext);

  const isTruelyEmpty = React.useMemo(() => {
    return !getAllLeaves(discoveryTree).length;
  }, [discoveryTree]);

  const emptyStateContent = React.useMemo(() => {
    if (isTruelyEmpty) {
      return (
        <EmptyStateSecondaryActions>
          Start launching a Java application or define a{' '}
          <Link to={'/topology/create-custom-target'}>Custom Target</Link>.
        </EmptyStateSecondaryActions>
      );
    }
    return (
      <>
        <EmptyStateBody>Adjust your filters/searches and try again.</EmptyStateBody>
        <EmptyStateSecondaryActions>
          <Button variant={'link'} onClick={() => dispatch(topologyDeleteAllFiltersIntent())}>
            Clear Filters
          </Button>
          <Button variant={'link'} onClick={() => searchExprService.setSearchExpression('')}>
            Clear Searches
          </Button>
        </EmptyStateSecondaryActions>
      </>
    );
  }, [isTruelyEmpty, searchExprService, dispatch]);

  return (
    <Bullseye {...props}>
      <EmptyState variant={EmptyStateVariant.full}>
        <EmptyStateIcon variant="container" component={TopologyIcon} />
        <Title headingLevel="h3" size="lg">
          No Targets Found
        </Title>
        {emptyStateContent}
      </EmptyState>
    </Bullseye>
  );
};
