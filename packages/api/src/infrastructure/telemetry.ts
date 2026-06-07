
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { metrics } from '@opentelemetry/api';

const exporter = new PrometheusExporter({ port: 9464, endpoint: '/metrics' });

const sdk = new NodeSDK({ metricReader: exporter });
sdk.start();

const meter = metrics.getMeter('alentapp-api');

export const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total de requests HTTP',
});

export const errorCounter = meter.createCounter('http.requests.errors', {
  description: 'Total de requests con error (status >= 400)',
});

export const requestDuration = meter.createHistogram('http.request.duration', {
  description: 'Duración de requests en ms',
  unit: 'ms',
});

export const activeRequests = meter.createUpDownCounter('http.requests.active', {
  description: 'Requests concurrentes en ejecución',
});

export const memoryGauge = meter.createObservableGauge('process.memory.usage', {
  description: 'Uso de memoria del proceso en bytes',
  unit: 'bytes',
});

memoryGauge.addCallback((result) => {
  result.observe(process.memoryUsage().heapUsed);
});