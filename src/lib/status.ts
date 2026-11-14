// importing all the required types
import type { 
  Environment,
  IndicatorRule,
  Reading,
  StatusResult,
 } from "@/lib/types";
 // importing the indicator rules from the data file
 import indicatorRules from "@/data/indicators.json";

// Constant value: readings older than this are treated as unknown (demo parameter).
export const STALE_AFTER_HOURS = 48; // demo parameter

// Stub: returns a fixed result so the screens and scripts can be built before
// the real rules exist. 
export function getStatus(
  reading: Reading,
  history: Reading[],
  environment: Environment,
  missionDay: number,
  now: Date,
): StatusResult {
  return checkReading(
    reading,
    history, 
    indicatorRules as IndicatorRule[],
    environment,
    missionDay,
    now
  );
}


// checkReadingFunction
export function checkReading(                                                                                 
  reading: Reading,                                                                                           
  history: Reading[],                                                                                         
  rules: IndicatorRule[],                                                                                     
  environment: Environment,                                                                                   
  missionDay: number,                                                                                         
  now: Date,                                                                                                  
): StatusResult {
  // ignore unused parameters
  void [history, environment, missionDay, now];

  // for now we handle single value readings only
  if (reading.indicator === "bloodPressure") {
    return {
      status: "unknown",
      reasons: ["Blood pressure is not built yet."],
      referenceRange: null,
      baseline: null,
      criticalLimitCrossed: false,
    };
  }

  // find the rule for this reading
  const rule = rules.find(
    (r) => r.measure === reading.indicator && r.context === reading.context
  );

  // if no rule found, return unknown
  if (!rule) {
    return {
      status: "unknown",
      reasons: [`No rule found for ${reading.indicator} in ${reading.context}`],
      referenceRange: null,
      baseline: null,
      criticalLimitCrossed: false,
    }
  }

  //  check if the data is older than STALE_AFTER_HOURS hours CHECK 1
  const readingTimeMs = new Date(reading.timestamp).getTime();
  const staleTimeMs = (now.getTime() - readingTimeMs) / (1000 * 60 * 60);
  if (Number.isNaN(readingTimeMs) || staleTimeMs > STALE_AFTER_HOURS) {
    return {                                                                                                    
      status: "unknown",                                                                                        
      reasons: [`Reading is older than ${STALE_AFTER_HOURS} hours.`],                                           
      referenceRange: null,                                                                                     
      baseline: null,                                                                                           
      criticalLimitCrossed: false,                                                                              
    };
  }

  // check the critical limit CHECK 2
  const referenceRange = {
    low: rule.earthRange.low,
    high: rule.earthRange.high,
    adjusted: false,
    source: rule.earthRange.source,
  }

  if (rule.criticalLimit !== null) {
    if (rule.criticalLimit.low !== null && reading.value < rule.criticalLimit.low) {
      return {
        status: "red",
        reasons: [`Critical limit crossed: ${reading.value} < ${rule.criticalLimit.low}`],
        referenceRange,
        baseline: null,
        criticalLimitCrossed: true,
      }
    }
    if (rule.criticalLimit.high !== null && reading.value > rule.criticalLimit.high) {
      return {
        status: "red",
        reasons: [`Critical limit crossed: ${reading.value} > ${rule.criticalLimit.high}`],
        referenceRange,
        baseline: null,
        criticalLimitCrossed: true,
      }
    }
  }

  // did it cross the reference range CHECK 3 
  // Amber: outside the reference range
  if (referenceRange.low !== null && reading.value < referenceRange.low) {
    return {
      status: "amber",
      reasons: [
        `${reading.indicator} ${reading.value} ${reading.unit} is below the reference range of ${referenceRange.low} to ${referenceRange.high} ${reading.unit}.`,
      ],
      referenceRange,
      baseline: null,
      criticalLimitCrossed: false,
    };
  }

  if (referenceRange.high !== null && reading.value > referenceRange.high) {
    return {
      status: "amber",
      reasons: [
        `${reading.indicator} ${reading.value} ${reading.unit} is above the reference range of ${referenceRange.low} to ${referenceRange.high} ${reading.unit}.`,
      ],
      referenceRange,
      baseline: null,
      criticalLimitCrossed: false,
    };
  }

  
  // demo return value
  return {                                                                                                    
    status: "green",                                                                                          
    reasons: ["No checks fired."],                                                                            
    referenceRange: {                                                                                         
      low: rule.earthRange.low,                                                                               
      high: rule.earthRange.high,                                                                             
      adjusted: false,                                                                                        
      source: rule.earthRange.source,                                                                         
    },                                                                                                        
    baseline: null,                                                                                           
    criticalLimitCrossed: false,                                                                              
  };
}