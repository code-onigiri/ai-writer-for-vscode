/**
 * Performance Monitor
 * 
 * Tracks performance metrics for AI generation operations,
 * provider calls, and system resources.
 */

/**
 * Performance metric data point
 */
export interface PerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: 'ms' | 'bytes' | 'count' | 'percent';
  readonly timestamp: string;
  readonly tags?: Record<string, string>;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  readonly metric: string;
  readonly warningLevel: number;
  readonly criticalLevel: number;
  readonly checkInterval: number; // in milliseconds
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  readonly metric: string;
  readonly level: 'warning' | 'critical';
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: string;
  readonly message: string;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  readonly startTime: string;
  readonly endTime: string;
  readonly metrics: PerformanceMetric[];
  readonly alerts: PerformanceAlert[];
  readonly summary: {
    readonly totalOperations: number;
    readonly averageResponseTime: number;
    readonly peakMemoryUsage: number;
    readonly errorRate: number;
  };
}

/**
 * Performance Monitor Options
 */
export interface PerformanceMonitorOptions {
  thresholds?: PerformanceThreshold[];
  sampleInterval?: number; // in milliseconds
  retentionPeriod?: number; // in milliseconds
  onAlert?: (alert: PerformanceAlert) => void;
}

/**
 * Performance Monitor Interface
 */
export interface PerformanceMonitor {
  recordMetric(metric: PerformanceMetric): void;
  startOperation(operationName: string): () => void;
  getMetrics(since?: Date): PerformanceMetric[];
  getReport(startTime: Date, endTime: Date): PerformanceReport;
  clearMetrics(): void;
  getAlerts(since?: Date): PerformanceAlert[];
}

/**
 * Metric storage
 */
type MetricStore = PerformanceMetric[];

/**
 * Alert storage
 */
type AlertStore = PerformanceAlert[];

/**
 * Active operation tracking
 */
interface ActiveOperation {
  name: string;
  startTime: number;
  tags?: Record<string, string>;
}

/**
 * Creates a Performance Monitor instance
 */
export function createPerformanceMonitor(
  options: PerformanceMonitorOptions = {}
): PerformanceMonitor {
  const metrics: MetricStore = [];
  const alerts: AlertStore = [];
  const activeOperations = new Map<string, ActiveOperation>();

  const sampleInterval = options.sampleInterval ?? 60000; // 1 minute
  const retentionPeriod = options.retentionPeriod ?? 86400000; // 24 hours
  const thresholds = options.thresholds ?? [];
  const onAlert = options.onAlert;

  // Periodic cleanup of old metrics
  setInterval(() => {
    cleanupOldMetrics();
  }, sampleInterval);

  return {
    recordMetric: (metric: PerformanceMetric) => {
      recordMetricImpl(metric, metrics, thresholds, alerts, onAlert);
    },

    startOperation: (operationName: string) => {
      return startOperationImpl(operationName, activeOperations, metrics);
    },

    getMetrics: (since?: Date) => {
      return getMetricsImpl(since, metrics);
    },

    getReport: (startTime: Date, endTime: Date) => {
      return getReportImpl(startTime, endTime, metrics, alerts);
    },

    clearMetrics: () => {
      clearMetricsImpl(metrics, alerts);
    },

    getAlerts: (since?: Date) => {
      return getAlertsImpl(since, alerts);
    },
  };

  function cleanupOldMetrics() {
    const cutoffTime = Date.now() - retentionPeriod;
    const cutoffDate = new Date(cutoffTime).toISOString();

    // Remove old metrics
    while (metrics.length > 0 && metrics[0].timestamp < cutoffDate) {
      metrics.shift();
    }

    // Remove old alerts
    while (alerts.length > 0 && alerts[0].timestamp < cutoffDate) {
      alerts.shift();
    }
  }
}

/**
 * Implementation of recordMetric
 */
function recordMetricImpl(
  metric: PerformanceMetric,
  metrics: MetricStore,
  thresholds: PerformanceThreshold[],
  alerts: AlertStore,
  onAlert?: (alert: PerformanceAlert) => void
): void {
  metrics.push(metric);

  // Check thresholds
  for (const threshold of thresholds) {
    if (threshold.metric === metric.name) {
      let level: 'warning' | 'critical' | null = null;
      let thresholdValue = 0;

      if (metric.value >= threshold.criticalLevel) {
        level = 'critical';
        thresholdValue = threshold.criticalLevel;
      } else if (metric.value >= threshold.warningLevel) {
        level = 'warning';
        thresholdValue = threshold.warningLevel;
      }

      if (level) {
        const alert: PerformanceAlert = {
          metric: metric.name,
          level,
          value: metric.value,
          threshold: thresholdValue,
          timestamp: new Date().toISOString(),
          message: `${metric.name} ${level}: ${metric.value}${metric.unit} (threshold: ${thresholdValue}${metric.unit})`,
        };

        alerts.push(alert);

        if (onAlert) {
          onAlert(alert);
        }
      }
    }
  }
}

/**
 * Implementation of startOperation
 */
function startOperationImpl(
  operationName: string,
  activeOperations: Map<string, ActiveOperation>,
  metrics: MetricStore
): () => void {
  const operationId = `${operationName}-${Date.now()}`;
  const operation: ActiveOperation = {
    name: operationName,
    startTime: Date.now(),
  };

  activeOperations.set(operationId, operation);

  // Return a function to end the operation
  return () => {
    const op = activeOperations.get(operationId);
    if (op) {
      const duration = Date.now() - op.startTime;
      const metric: PerformanceMetric = {
        name: `operation.${op.name}.duration`,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: op.tags,
      };

      metrics.push(metric);
      activeOperations.delete(operationId);
    }
  };
}

/**
 * Implementation of getMetrics
 */
function getMetricsImpl(since: Date | undefined, metrics: MetricStore): PerformanceMetric[] {
  if (!since) {
    return [...metrics];
  }

  const sinceIso = since.toISOString();
  return metrics.filter((m) => m.timestamp >= sinceIso);
}

/**
 * Implementation of getReport
 */
function getReportImpl(
  startTime: Date,
  endTime: Date,
  metrics: MetricStore,
  alerts: AlertStore
): PerformanceReport {
  const startIso = startTime.toISOString();
  const endIso = endTime.toISOString();

  const filteredMetrics = metrics.filter(
    (m) => m.timestamp >= startIso && m.timestamp <= endIso
  );

  const filteredAlerts = alerts.filter(
    (a) => a.timestamp >= startIso && a.timestamp <= endIso
  );

  // Calculate summary statistics
  const operationMetrics = filteredMetrics.filter((m) =>
    m.name.startsWith('operation.')
  );
  const totalOperations = operationMetrics.length;
  const averageResponseTime =
    totalOperations > 0
      ? operationMetrics.reduce((sum, m) => sum + m.value, 0) / totalOperations
      : 0;

  const memoryMetrics = filteredMetrics.filter((m) => m.name.includes('memory'));
  const peakMemoryUsage =
    memoryMetrics.length > 0 ? Math.max(...memoryMetrics.map((m) => m.value)) : 0;

  const errorMetrics = filteredMetrics.filter((m) => m.name.includes('error'));
  const errorRate =
    totalOperations > 0 ? errorMetrics.length / totalOperations : 0;

  return {
    startTime: startIso,
    endTime: endIso,
    metrics: filteredMetrics,
    alerts: filteredAlerts,
    summary: {
      totalOperations,
      averageResponseTime,
      peakMemoryUsage,
      errorRate,
    },
  };
}

/**
 * Implementation of clearMetrics
 */
function clearMetricsImpl(metrics: MetricStore, alerts: AlertStore): void {
  metrics.length = 0;
  alerts.length = 0;
}

/**
 * Implementation of getAlerts
 */
function getAlertsImpl(since: Date | undefined, alerts: AlertStore): PerformanceAlert[]

 {
  if (!since) {
    return [...alerts];
  }

  const sinceIso = since.toISOString();
  return alerts.filter((a) => a.timestamp >= sinceIso);
}
