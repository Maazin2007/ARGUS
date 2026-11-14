// Shared contracts (build plan section 6). Everyone codes against these types,
// so change them only after telling the whole team.

export type IndicatorId =
  | "heartRate"
  | "bloodPressure"
  | "bloodGlucose"
  | "bodyTemperature"
  | "sleepDuration"
  | "mood";

export type Environment = "earth" | "station" | "marsTransit";

export type Status = "green" | "amber" | "red" | "unknown";

// ---- Readings ----

type ReadingBase = {
  id: string;
  unit: string;
  timestamp: string; // ISO 8601, UTC, e.g. "2026-11-14T13:00:00Z"
  missionDay: number;
  environment: Environment;
  context: string; // e.g. "resting", "exercise", "fasting", "unknown"
  simulated: boolean;
};

export type ValueReading = ReadingBase & {
  indicator: Exclude<IndicatorId, "bloodPressure">;
  value: number;
};

export type BloodPressureReading = ReadingBase & {
  indicator: "bloodPressure";
  systolic: number;
  diastolic: number;
};

// Check `reading.indicator === "bloodPressure"` first; TypeScript then knows
// which fields exist.
export type Reading = ValueReading | BloodPressureReading;

export type CheckIn = {
  id: string;
  timestamp: string;
  selfRating: 1 | 2 | 3 | 4 | 5;
};

// ---- Status ----

// null means "no limit on this side".
export type Range = { low: number | null; high: number | null };

export type StatusResult = {
  status: Status;
  reasons: string[]; // one plain sentence per rule that fired
  referenceRange: (Range & { adjusted: boolean; source: string }) | null;
  baseline: (Range & { count: number }) | null;
  criticalLimitCrossed: boolean;
};

// ---- Indicator config (src/data/indicators.json) ----

// Blood pressure is two numbers, so it has two measures.
export type Measure =
  | Exclude<IndicatorId, "bloodPressure">
  | "systolic"
  | "diastolic";

export type Adjustment = {
  environments: Environment[];
  shift: number; // added to both ends of the earth range at full ramp
  rampDays: number;
  source: string;
  note: string;
};

// One rule per measure and context. No matching rule means status "unknown".
export type IndicatorRule = {
  measure: Measure;
  context: string;
  unit: string;
  earthRange: Range & { source: string };
  criticalLimit: (Range & { source: string }) | null; // null: no red rule
  baselineFloor: number | null; // smallest deviation that counts; null: no baseline rule
  adjustments: Adjustment[];
};

// ---- Card content (src/data/cards.json) ----

export type Sourced = { text: string; source: string };

export type Card = {
  indicator: IndicatorId;
  howToMeasure: Sourced;
  whyItMatters: Sourced;
  hazardEffects: (Sourced & { hazard: string })[];
  selfCare: Sourced[];
  whenToEscalate: Sourced;
};

// ---- Emergency steps (src/data/emergency.json) ----

export type EmergencyStep = {
  id: string;
  type: "question" | "instruction";
  text: string;
  yes: string | null; // next step id for a question
  no: string | null;
  next: string | null; // next step id for an instruction; null ends the tree
  timerSeconds: number | null;
  label: "Published" | "Demo copy";
  source: string;
};
