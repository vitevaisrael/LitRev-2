import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  startTimer(operation: string): () => PerformanceMetrics {
    const start = performance.now();
    
    return (metadata?: Record<string, any>): PerformanceMetrics => {
      const duration = performance.now() - start;
      const metric: PerformanceMetrics = {
        operation,
        duration,
        timestamp: Date.now(),
        metadata
      };
      
      this.addMetric(metric);
      return metric;
    };
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / operationMetrics.length;
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getStats(): {
    totalOperations: number;
    averageDuration: number;
    slowOperations: number;
    operationsByType: Record<string, { count: number; avgDuration: number }>;
  } {
    const totalOperations = this.metrics.length;
    const averageDuration = totalOperations > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;
    
    const slowOperations = this.getSlowOperations().length;
    
    const operationsByType: Record<string, { count: number; avgDuration: number }> = {};
    this.metrics.forEach(metric => {
      if (!operationsByType[metric.operation]) {
        operationsByType[metric.operation] = { count: 0, avgDuration: 0 };
      }
      operationsByType[metric.operation].count++;
    });
    
    // Calculate average duration for each operation type
    Object.keys(operationsByType).forEach(operation => {
      operationsByType[operation].avgDuration = this.getAverageDuration(operation);
    });
    
    return {
      totalOperations,
      averageDuration,
      slowOperations,
      operationsByType
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for measuring function performance
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const endTimer = performanceMonitor.startTimer(operation);
      try {
        const result = await method.apply(this, args);
        endTimer({ success: true });
        return result;
      } catch (error) {
        endTimer({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    };
  };
}

// Utility function for measuring async operations
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const endTimer = performanceMonitor.startTimer(operation);
  try {
    const result = await fn();
    endTimer({ ...metadata, success: true });
    return result;
  } catch (error) {
    endTimer({ 
      ...metadata, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

// Database query performance monitoring
export function measureDatabaseQuery<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  return measureAsync(`db.${queryName}`, query);
}

// API endpoint performance monitoring
export function measureApiEndpoint<T>(
  endpoint: string,
  handler: () => Promise<T>
): Promise<T> {
  return measureAsync(`api.${endpoint}`, handler);
}
