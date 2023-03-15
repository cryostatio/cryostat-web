import React from "react";
import ReactJoyride from "react-joyride";

const steps = [
    {
        target: "pf-c-page__main-sectionk",
        content: "Welcome to Cryostat! This is a quick tour of the UI.",
    },
    {
        target: ".pf-c-page__header-brand-link",
        content: "This is the Cryostat logo. Clicking it will take you to the home page.",
        disableBeacon: true,
    },
    {
        target: ".pf-c-page__header-tools",
        content: "This is the toolbar. It contains the settings cog, the help icon, and the user menu.",
        disableBeacon: true,
    },
    {
        target: ".pf-c-page__header-tools",
        content: "Clicking the settings cog will take you to the settings page.",
        disableBeacon: true,
    },
];

export const CryostatJoyride: React.FC = ({}) => {
    return (
        <ReactJoyride
            steps={steps}
            continuous={true}
            showSkipButton={true}
            showProgress={true}
            run={true}
        />
    );
};
