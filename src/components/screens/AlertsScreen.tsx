"use client";

import { Screen } from "@/components/Screen";

// Alert test: an empty shell for now. The real table and trace come from the backend's
// `npm run evaluate` (scripts/scenarios/fever.json -> results/fever.md). Until that exists
// we show honest empty states, never invented scenario numbers or results.
export function AlertsScreen() {
  return (
    <Screen label="Alert test">
      <div className="grid">
        <div className="cell c12 flush">
          <div className="head">
            <h2>
              <span className="ix mono">01</span>Alert results
            </h2>
            <span className="pill">SIMULATED DATA · FROZEN SEED</span>
          </div>
          <div style={{ padding: "0 24px 16px" }}>
            <p className="note" style={{ margin: 0 }}>
              Scenario not committed yet. The fever scenario (scripts/scenarios/fever.json) and the
              results table (results/fever.md) are being built by the backend team.
            </p>
          </div>
          <div className="tw">
            <table className="plain">
              <thead>
                <tr>
                  <th>Method</th>
                  <th className="r">
                    First amber
                    <br />
                    days after onset
                  </th>
                  <th className="r">
                    First red
                    <br />
                    days after onset
                  </th>
                  <th className="r">
                    Missed
                    <br />
                    fever readings left green
                  </th>
                  <th className="r">
                    False amber
                    <br />
                    healthy period
                  </th>
                  <th className="r">
                    False red
                    <br />
                    healthy period
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} style={{ color: "var(--mu)" }}>
                    Results table not generated yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ padding: "16px 24px 24px" }}>
            <p className="note" style={{ margin: 0 }}>
              <strong>Limits.</strong> This is a software test of the status rules on one simulated
              scenario. It is not clinical validation. All three methods run the same getStatus
              function used by the dashboard. Parameters were frozen before this table was
              generated.
            </p>
          </div>
        </div>

        <div className="cell c12 flush">
          <div className="head">
            <h2>
              <span className="ix mono">02</span>Scenario trace
            </h2>
            <span className="hint mono">Status per reading, by method</span>
          </div>
          <div className="chart well">
            <svg viewBox="0 0 760 260" role="img" aria-label="Scenario trace, no scenario data yet">
              <text
                className="svg-t"
                x="380"
                y="130"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fill="var(--mu)"
              >
                No scenario data
              </text>
            </svg>
          </div>
          <div style={{ height: 16 }}></div>
        </div>
      </div>
    </Screen>
  );
}
