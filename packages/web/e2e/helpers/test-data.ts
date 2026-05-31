export function uniqueDni(): string {
    return Math.floor(Math.random() * 90000000 + 10000000).toString();
}

export function uniqueEmail(): string {
    return `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`;
}

export function uniqueName(prefix = 'E2E'): string {
    return `${prefix}-${Date.now()}`;
}

export function futureDate(daysFromNow = 60): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
}