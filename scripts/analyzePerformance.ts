import fs from "fs";
import path from "path";

interface PerformanceEntry {
  name: string;
  duration: number;
  timestamp: number;
}

interface PerformanceSummary {
  operation: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
}

function analyzePerformanceData(logFile: string): void {
  try {
    // Read the log file
    const logContent = fs.readFileSync(logFile, "utf-8");

    // Parse performance entries
    const entries: PerformanceEntry[] = [];
    const performanceRegex = /Performance: (.*?) - (\d+)ms/;

    logContent.split("\n").forEach((line) => {
      const match = line.match(performanceRegex);
      if (match) {
        entries.push({
          name: match[1],
          duration: parseInt(match[2], 10),
          timestamp: Date.now(), // Using current timestamp as we don't have it in logs
        });
      }
    });

    // Group entries by operation
    const operationGroups = new Map<string, PerformanceEntry[]>();
    entries.forEach((entry) => {
      const group = operationGroups.get(entry.name) || [];
      group.push(entry);
      operationGroups.set(entry.name, group);
    });

    // Calculate statistics for each operation
    const summaries: PerformanceSummary[] = [];
    operationGroups.forEach((group, operation) => {
      const durations = group.map((entry) => entry.duration);
      const summary: PerformanceSummary = {
        operation,
        count: group.length,
        totalDuration: durations.reduce((sum, duration) => sum + duration, 0),
        averageDuration: 0,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
      };
      summary.averageDuration = summary.totalDuration / summary.count;
      summaries.push(summary);
    });

    // Sort summaries by average duration (descending)
    summaries.sort((a, b) => b.averageDuration - a.averageDuration);

    // Generate report
    const report = [
      "Performance Analysis Report",
      "=======================",
      "",
      ...summaries
        .map((summary) => [
          `Operation: ${summary.operation}`,
          `  Count: ${summary.count}`,
          `  Average Duration: ${summary.averageDuration.toFixed(2)}ms`,
          `  Min Duration: ${summary.minDuration}ms`,
          `  Max Duration: ${summary.maxDuration}ms`,
          `  Total Duration: ${summary.totalDuration}ms`,
          "",
        ])
        .flat(),
    ].join("\n");

    // Write report to file
    const reportPath = path.join(
      path.dirname(logFile),
      "performance-report.txt",
    );
    fs.writeFileSync(reportPath, report);
    console.log(`Performance report written to: ${reportPath}`);
  } catch (error) {
    console.error("Error analyzing performance data:", error);
  }
}

// If running directly
if (require.main === module) {
  const logFile = process.argv[2];
  if (!logFile) {
    console.error("Please provide a log file path");
    process.exit(1);
  }
  analyzePerformanceData(logFile);
}

export { analyzePerformanceData };
