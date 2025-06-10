import { CONSTANTS } from '../config/constants.js';

export class TradePrivateMonitoring {
  static events = [];
  static metrics = {
    proofGenerationTimes: [],
    transactionFailures: 0,
    nullifierCollisions: 0,
    keeperFailures: new Map(),
    networkErrors: 0,
    userActions: new Map()
  };

  static logEvent(type, data) {
    const event = {
      type,
      data,
      timestamp: Date.now(),
      sessionId: sessionStorage.getItem('tradeprivate-session'),
      userAgent: navigator.userAgent,
      network: window.ethereum?.networkVersion
    };

    this.events.push(event);

    // Send to analytics service if configured
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', `tradeprivate_${type}`, {
        event_category: 'TradePrivate',
        event_label: data.label || type,
        value: data.value
      });
    }

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[TradePrivate] ${type}:`, data);
    }
  }

  static trackProofGeneration(type, duration) {
    this.metrics.proofGenerationTimes.push({
      type,
      duration,
      timestamp: Date.now()
    });

    this.logEvent('proof_generation', { type, duration });

    // Alert if generation is slow
    if (duration > 5000) {
      console.warn(`Slow proof generation: ${type} took ${duration}ms`);
      this.logEvent('slow_proof_generation', { type, duration });
    }
  }

  static trackTransactionFailure(error, context) {
    this.metrics.transactionFailures++;
    
    const errorData = {
      message: error.message,
      code: error.code,
      context,
      stack: import.meta.env.DEV ? error.stack : undefined
    };

    this.logEvent('transaction_failure', errorData);

    // Track specific error types
    if (error.message.includes('NullifierAlreadyUsed')) {
      this.metrics.nullifierCollisions++;
    } else if (error.message.includes('network')) {
      this.metrics.networkErrors++;
    }

    // Alert on high failure rate
    if (this.metrics.transactionFailures % 5 === 0) {
      console.error('High transaction failure rate detected:', this.metrics.transactionFailures);
    }
  }

  static trackKeeperFailure(keeperAddress, reason) {
    const failures = this.metrics.keeperFailures.get(keeperAddress) || 0;
    this.metrics.keeperFailures.set(keeperAddress, failures + 1);

    this.logEvent('keeper_failure', {
      keeper: keeperAddress,
      reason,
      totalFailures: failures + 1
    });
  }

  static trackUserAction(action, data = {}) {
    const count = this.metrics.userActions.get(action) || 0;
    this.metrics.userActions.set(action, count + 1);

    this.logEvent('user_action', {
      action,
      ...data
    });
  }

  static getMetricsSummary() {
    const proofTimes = this.metrics.proofGenerationTimes;
    const avgProofTime = proofTimes.length > 0
      ? proofTimes.reduce((sum, p) => sum + p.duration, 0) / proofTimes.length
      : 0;

    const recentProofTimes = proofTimes.filter(
      p => Date.now() - p.timestamp < 3600000 // Last hour
    );

    return {
      avgProofGenerationTime: Math.round(avgProofTime),
      recentAvgProofTime: recentProofTimes.length > 0
        ? Math.round(recentProofTimes.reduce((sum, p) => sum + p.duration, 0) / recentProofTimes.length)
        : 0,
      totalTransactions: this.events.filter(e => e.type === 'transaction_success').length,
      transactionFailures: this.metrics.transactionFailures,
      failureRate: this.metrics.transactionFailures / 
        (this.events.filter(e => e.type.includes('transaction')).length || 1),
      nullifierCollisions: this.metrics.nullifierCollisions,
      networkErrors: this.metrics.networkErrors,
      topFailingKeepers: Array.from(this.metrics.keeperFailures.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      userActions: Object.fromEntries(this.metrics.userActions)
    };
  }

  static exportMetrics() {
    const summary = this.getMetricsSummary();
    const data = {
      summary,
      events: this.events,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeprivate-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
} 