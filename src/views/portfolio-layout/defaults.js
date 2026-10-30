// Standard layout used until the server layout is available.
export const DEFAULT_WIDGETS = [
  {
    "id": "executive_cards",
    "kind": "builtin",
    "builtin": "executive_cards",
    "title": "Executive Performance Overview",
    "width": 12,
    "visible": true,
    "height": 280
  },
  {
    "id": "pillar_summary",
    "kind": "builtin",
    "builtin": "pillar_summary",
    "title": "Pillars ({year} Annual Value)",
    "width": 6,
    "visible": true,
    "height": 280
  },
  {
    "id": "yearly_summary",
    "kind": "builtin",
    "builtin": "yearly_summary",
    "title": "Cumulative Actual and Target",
    "width": 6,
    "visible": true,
    "height": 280
  },
  {
    "id": "cumulative_trend",
    "kind": "builtin",
    "builtin": "cumulative_trend",
    "title": "Cumulative AI Values",
    "width": 6,
    "visible": true,
    "height": 280
  },
  {
    "id": "annual_trend",
    "kind": "builtin",
    "builtin": "annual_trend",
    "title": "Annual AI Value Increase",
    "width": 6,
    "visible": true,
    "height": 280
  },
  {
    "id": "dtit",
    "kind": "grouped",
    "title": "DTIT Involved",
    "width": 3,
    "visible": true,
    "height": 280,
    "chartType": "pie",
    "groupBy": "dtitInvolved",
    "measure": "count",
    "filterGate": "ALL",
    "maxCategories": 10,
    "sort": "valueDesc"
  },
  {
    "id": "foak",
    "kind": "grouped",
    "title": "FOAK / NOAK",
    "width": 3,
    "visible": true,
    "height": 280,
    "chartType": "pie",
    "groupBy": "foakNoak",
    "measure": "count",
    "filterGate": "ALL",
    "maxCategories": 10,
    "sort": "valueDesc"
  },
  {
    "id": "pillar",
    "kind": "grouped",
    "title": "Pillars ({year} Annual Value)",
    "width": 3,
    "visible": true,
    "height": 280,
    "chartType": "pie",
    "groupBy": "pillars",
    "measure": "annualSavings",
    "filterGate": "ALL",
    "maxCategories": 10,
    "sort": "valueDesc"
  },
  {
    "id": "kpi_breakdown",
    "kind": "builtin",
    "builtin": "kpi_breakdown",
    "title": "KPI Breakdown",
    "width": 3,
    "visible": true,
    "height": 280
  }
];
export const DEFAULT_CATALOG = {
  "builtins": [
    {
      "value": "executive_cards",
      "label": "Overall / gate / Operationalised cards"
    },
    {
      "value": "pillar_summary",
      "label": "Pillar annual-value table"
    },
    {
      "value": "yearly_summary",
      "label": "Yearly cumulative actual / target table"
    },
    {
      "value": "cumulative_trend",
      "label": "Cumulative actual / target trend"
    },
    {
      "value": "annual_trend",
      "label": "Annual actual / target trend"
    },
    {
      "value": "kpi_breakdown",
      "label": "KPI value breakdown"
    }
  ],
  "groups": [
    {
      "value": "projectStatus",
      "label": "Project Status",
      "type": "text"
    },
    {
      "value": "pillars",
      "label": "Pillars",
      "type": "text"
    },
    {
      "value": "sites",
      "label": "Sites",
      "type": "text"
    },
    {
      "value": "currentPmoGate",
      "label": "Current PMO Gate",
      "type": "text"
    },
    {
      "value": "dtitInvolved",
      "label": "DTIT Involved",
      "type": "text"
    },
    {
      "value": "aiAaAType",
      "label": "AI / AA / A Type",
      "type": "text"
    },
    {
      "value": "foakNoak",
      "label": "FOAK / NOAK",
      "type": "text"
    }
  ],
  "measures": [
    {
      "value": "count",
      "label": "Project count",
      "unit": "count"
    },
    {
      "value": "annualSavings",
      "label": "Current-year annual savings increase",
      "unit": "currency"
    },
    {
      "value": "cumulativeSavings",
      "label": "Current-year cumulative savings",
      "unit": "currency"
    },
    {
      "value": "field:capacityGainValue",
      "label": "Total Capacity Gain Value",
      "unit": "currency"
    },
    {
      "value": "field:dlValue",
      "label": "Total DL Value",
      "unit": "currency"
    },
    {
      "value": "field:idlValue",
      "label": "Total IDL Value",
      "unit": "currency"
    },
    {
      "value": "field:yieldValue",
      "label": "Total Yield Value",
      "unit": "currency"
    },
    {
      "value": "field:qualityValue",
      "label": "Total Quality Value",
      "unit": "currency"
    },
    {
      "value": "field:dlEquivalent",
      "label": "Total DL Equivalent",
      "unit": "number"
    },
    {
      "value": "field:idlFte",
      "label": "Total IDL FTE",
      "unit": "number"
    },
    {
      "value": "field:qualityCases",
      "label": "Total Quality Cases",
      "unit": "number"
    }
  ]
};
