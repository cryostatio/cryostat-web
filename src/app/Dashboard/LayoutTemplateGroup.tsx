import { CatalogTile, CatalogTileBadge } from "@patternfly/react-catalog-view-extension";
import { EmptyState, EmptyStateBody, EmptyStateIcon, Gallery, GalleryItem, Title } from "@patternfly/react-core";
import { CheckCircleIcon, PficonTemplateIcon } from "@patternfly/react-icons";
import React from "react";
import { BlankLayout } from "./dashboard-templates";
import { iconify, LayoutTemplate, LayoutTemplateIcon } from "./DashboardUtils";

export interface LayoutTemplateGroupProps {
    title: string;
    templates: LayoutTemplate[];
    onTemplateSelect: (templateName: LayoutTemplate) => void;
  }
  
  export const LayoutTemplateGroup: React.FC<LayoutTemplateGroupProps> = ({ onTemplateSelect, ...props }) => {
    const [selectedTemplate, setSelectedTemplate] = React.useState<string>(BlankLayout.name);
  
    const handleTemplateSelect = React.useCallback(
      (template: LayoutTemplate) => {
        setSelectedTemplate(template.name);
        onTemplateSelect(template);
      },
      [setSelectedTemplate, onTemplateSelect]
    );


    return (
      <>
        <Title headingLevel="h2" size="lg" style={{ padding: '1em' }}>
          {props.title}
        </Title>
        <Gallery hasGutter={true} className="layout-template-picker">
          {props.templates.length !== 0 ? (
            props.templates.map((layout) => (
              <GalleryItem key={layout.name}>
                <CatalogTile
                  featured={selectedTemplate === layout.name}
                  id={layout.name}
                  key={layout.name}
                  icon={iconify(layout.icon)}
                  title={layout.name}
                  vendor={layout.vendor}
                  onClick={() => handleTemplateSelect(layout)}
                  badges={[
                    <CatalogTileBadge title="Selected" key={layout.name}>
                      {selectedTemplate === layout.name && (
                        <CheckCircleIcon color={'var(--pf-global--success-color--100)'} />
                      )}
                    </CatalogTileBadge>,
                  ]}
                >
                  {layout.description}
                </CatalogTile>
              </GalleryItem>
            ))
          ) : (
            <EmptyState>
              <EmptyStateIcon icon={PficonTemplateIcon} />
              <Title size="lg" headingLevel="h4">
                No templates found
              </Title>
              <EmptyStateBody>Upload your own templates!</EmptyStateBody>
            </EmptyState>
          )}
        </Gallery>
      </>
    );
  };
  