import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    rules: {
      // Flagged on normal data-fetching-in-effect patterns; too strict for this app.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
