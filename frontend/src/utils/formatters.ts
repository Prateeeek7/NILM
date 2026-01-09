export function formatCurrent(current: number): string {
  return `${current.toFixed(3)} A`;
}

export function formatVoltage(voltage: number): string {
  return `${voltage.toFixed(2)} V`;
}

export function formatPower(power: number): string {
  return `${power.toFixed(2)} W`;
}

export function formatEnergy(energy: number): string {
  return `${energy.toFixed(3)} kWh`;
}

export function formatCost(cost: number): string {
  return `₹${cost.toFixed(2)}`;
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

export function formatTimestamp(timestamp: number | string): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleString();
}

